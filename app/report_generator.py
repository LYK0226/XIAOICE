"""
PDF Report Generator for Child Development Video Analysis.
Generates a styled HTML report → PDF (via weasyprint or fallback to raw HTML).
Uploads the PDF to GCS and returns the download URL.
"""

import io
import json
import os
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from app import gcp_bucket

logger = logging.getLogger(__name__)


def _status_label(status: str) -> str:
    """Convert status code to Chinese label with emoji."""
    mapping = {
        "TYPICAL": "✅ 正常",
        "CONCERN": "⚠️ 需要關注",
        "NEEDS_ATTENTION": "🔴 需要注意",
        "UNABLE_TO_ASSESS": "❓ 無法評估",
        "PASS": "✅ 通過",
    }
    return mapping.get(status, status or "—")


def _build_html_report(report_data: Dict[str, Any], child_name: str, child_age_months: float) -> str:
    """Build a styled HTML string for the PDF report."""
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    age_years = child_age_months / 12
    age_display = f"{child_age_months:.0f} 個月（約 {age_years:.1f} 歲）"

    exec_summary = report_data.get("executive_summary", "未提供摘要")
    motor = report_data.get("motor_development", {})
    language = report_data.get("language_development", {})
    overall_recs = report_data.get("overall_recommendations", [])
    referral_needed = report_data.get("professional_referral_needed", False)
    referral_reason = report_data.get("referral_reason", "")

    def _list_html(items):
        if not items:
            return "<li>無</li>"
        if isinstance(items, str):
            return f"<li>{items}</li>"
        return "".join(f"<li>{item}</li>" for item in items)

    html = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>兒童發展影片分析報告 – {child_name}</title>
<style>
  @page {{ size: A4; margin: 2cm; }}
  body {{ font-family: "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif;
         font-size: 11pt; color: #333; line-height: 1.6; }}
  h1 {{ color: #2c5282; border-bottom: 3px solid #2c5282; padding-bottom: 8px; font-size: 20pt; }}
  h2 {{ color: #2d3748; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 24px; font-size: 14pt; }}
  h3 {{ color: #4a5568; font-size: 12pt; margin-top: 16px; }}
  .meta {{ background: #f7fafc; border-radius: 8px; padding: 12px 16px; margin: 12px 0; }}
  .meta span {{ display: inline-block; margin-right: 24px; }}
  .status-badge {{ display: inline-block; padding: 2px 10px; border-radius: 12px; font-weight: bold; font-size: 10pt; }}
  .status-TYPICAL {{ background: #c6f6d5; color: #22543d; }}
  .status-CONCERN {{ background: #fefcbf; color: #744210; }}
  .status-NEEDS_ATTENTION {{ background: #fed7d7; color: #822727; }}
  .status-UNABLE_TO_ASSESS {{ background: #e2e8f0; color: #4a5568; }}
  .section {{ margin-bottom: 20px; page-break-inside: avoid; }}
  ul {{ padding-left: 20px; }}
  li {{ margin-bottom: 4px; }}
  .referral {{ background: #fff5f5; border-left: 4px solid #e53e3e; padding: 12px; margin: 16px 0; border-radius: 4px; }}
  .footer {{ margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0;
             font-size: 9pt; color: #a0aec0; text-align: center; }}
</style>
</head>
<body>
<h1>🧒 兒童發展影片分析報告</h1>

<div class="meta">
  <span><strong>兒童姓名：</strong>{child_name}</span>
  <span><strong>年齡：</strong>{age_display}</span>
  <span><strong>分析日期：</strong>{now_str}</span>
</div>

<div class="section">
  <h2>📋 綜合評估摘要</h2>
  <p>{exec_summary}</p>
</div>

<div class="section">
  <h2>🏃 身體動作發展</h2>
  <p><strong>整體狀態：</strong>
    <span class="status-badge status-{motor.get('status', 'UNABLE_TO_ASSESS')}">
      {_status_label(motor.get('status', ''))}
    </span>
  </p>
  <h3>評估發現</h3>
  <p>{motor.get('findings', '未提供')}</p>
  <h3>優勢</h3>
  <ul>{_list_html(motor.get('strengths', []))}</ul>
  <h3>關注事項</h3>
  <ul>{_list_html(motor.get('concerns', []))}</ul>
  <h3>改善建議</h3>
  <ul>{_list_html(motor.get('recommendations', []))}</ul>
</div>

<div class="section">
  <h2>🗣️ 語言發展</h2>
  <p><strong>整體狀態：</strong>
    <span class="status-badge status-{language.get('status', 'UNABLE_TO_ASSESS')}">
      {_status_label(language.get('status', ''))}
    </span>
  </p>
  <h3>評估發現</h3>
  <p>{language.get('findings', '未提供')}</p>
  <h3>優勢</h3>
  <ul>{_list_html(language.get('strengths', []))}</ul>
  <h3>關注事項</h3>
  <ul>{_list_html(language.get('concerns', []))}</ul>
  <h3>改善建議</h3>
  <ul>{_list_html(language.get('recommendations', []))}</ul>
</div>

<div class="section">
  <h2>📌 整體建議</h2>
  <ul>{_list_html(overall_recs)}</ul>
</div>

{"<div class='referral'><h3>⚠️ 建議尋求專業評估</h3><p>" + str(referral_reason) + "</p></div>" if referral_needed else ""}

<div class="footer">
  <p>本報告由 XIAOICE AI 系統自動生成，僅供參考，不構成醫療診斷。如有疑慮請諮詢兒童發展專業人士。</p>
  <p>Generated by XIAOICE Child Development Analysis System • {now_str}</p>
</div>
</body>
</html>"""
    return html


def generate_and_upload_pdf(
    report_data: Dict[str, Any],
    child_name: str,
    child_age_months: float,
    user_id: int,
    report_id: str,
) -> Dict[str, Any]:
    """
    Generate an HTML-based PDF report and upload to GCS.

    Returns:
        Dict with 'pdf_gcs_url', 'pdf_storage_key', 'success', 'error'
    """
    try:
        html_content = _build_html_report(report_data, child_name, child_age_months)
        pdf_bytes = None

        # Try weasyprint first (produces real PDF)
        try:
            from weasyprint import HTML as WeasyprintHTML
            pdf_bytes = WeasyprintHTML(string=html_content).write_pdf()
            logger.info("PDF generated with weasyprint")
        except ImportError:
            logger.warning("weasyprint not installed; falling back to HTML file")
        except Exception as e:
            logger.warning(f"weasyprint failed: {e}; falling back to HTML file")

        if pdf_bytes:
            filename = f"report_{report_id}.pdf"
            content_type = "application/pdf"
            file_data = pdf_bytes
        else:
            # Fallback: save as HTML (still viewable / downloadable)
            filename = f"report_{report_id}.html"
            content_type = "text/html"
            file_data = html_content.encode("utf-8")

        storage_key = gcp_bucket.build_storage_key("reports", user_id, filename)

        # Upload via file-like object
        file_obj = io.BytesIO(file_data)
        file_obj.content_type = content_type
        gcs_url = gcp_bucket.upload_file_to_gcs(file_obj, storage_key)

        return {
            "success": True,
            "pdf_gcs_url": gcs_url,
            "pdf_storage_key": storage_key,
        }

    except Exception as e:
        logger.error(f"PDF generation/upload failed: {e}")
        return {"success": False, "error": str(e)}
