"""
PDF Report Generator for Child Development Video Analysis.
Generates a styled HTML report → PDF (via weasyprint or fallback to raw HTML).
Uploads the PDF to GCS and returns the download URL.
"""

import io
import json
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

# Hong Kong Time (UTC+8)
_HK_TZ = timezone(timedelta(hours=8))
def hk_now() -> datetime:
    return datetime.now(_HK_TZ).replace(tzinfo=None)

from app import gcp_bucket

logger = logging.getLogger(__name__)


def _category_label(item: dict) -> str:
    return item.get("category_label") or item.get("category") or "—"


def _status_label(status: str) -> str:
    """Convert status code to Chinese label with emoji."""
    mapping = {
        "TYPICAL": "✅ 正常",
        "CONCERN": "⚠️ 需要關注",
        "NEEDS_ATTENTION": "🔴 需要注意",
        "UNABLE_TO_ASSESS": "❓ 無法評估",
        "PASS": "✅ 達標",
    }
    return mapping.get(status, status or "—")


def _compliance_status_label(status: str) -> str:
    """Convert compliance status to Chinese label with colored badge HTML."""
    mapping = {
        "PASS": ("✅ 達標", "#c6f6d5", "#22543d"),
        "CONCERN": ("⚠️ 需關注", "#fefcbf", "#744210"),
        "UNABLE_TO_ASSESS": ("❓ 無法評估", "#e2e8f0", "#4a5568"),
    }
    label, bg, color = mapping.get(status, (status or "—", "#e2e8f0", "#4a5568"))
    return f'<span style="background:{bg};color:{color};padding:1px 6px;border-radius:8px;font-size:9pt;font-weight:bold;">{label}</span>'


def _standards_table_html(standards: list) -> str:
    """Build an HTML table for standards compliance results."""
    if not standards:
        return ""

    rows = ""
    for item in standards:
        if not isinstance(item, dict):
            continue
        standard = item.get("standard", "—")
        category = _category_label(item)
        status = item.get("status", "UNABLE_TO_ASSESS")
        rationale = item.get("rationale", "—")
        status_html = _compliance_status_label(status)
        rows += f"""<tr>
          <td>{standard}</td>
          <td>{category}</td>
          <td style="text-align:center;">{status_html}</td>
          <td style="font-size:9pt;">{rationale}</td>
        </tr>\n"""

    return f"""<table class="standards-table">
      <thead>
        <tr>
          <th>標準項目</th>
          <th>分類</th>
          <th>評估結果</th>
          <th>說明</th>
        </tr>
      </thead>
      <tbody>
        {rows}
      </tbody>
    </table>"""


def _dimension_section_html(
    title: str,
    emoji: str,
    dimension_data: dict,
    list_html_fn,
) -> str:
    """Build a standard dimension section (status + findings + strengths + concerns + recs + standards table)."""
    if not dimension_data or not isinstance(dimension_data, dict):
        return ""

    status = dimension_data.get("status", "UNABLE_TO_ASSESS")
    findings = dimension_data.get("findings", "未提供")
    strengths = dimension_data.get("strengths", [])
    concerns = dimension_data.get("concerns", [])
    recommendations = dimension_data.get("recommendations", [])
    standards_table = dimension_data.get("standards_table", [])
    rag_available = dimension_data.get("rag_available", True)

    # Build the standards table or a notice
    if rag_available and standards_table:
        table_html = f"""<h3>📊 年齡標準評估表</h3>\n{_standards_table_html(standards_table)}"""
    elif not rag_available:
        table_html = '<div class="no-rag-notice"><p>⚠️ 未找到該年齡層的參考標準，無法進行逐項評估。以下評估基於專業知識進行。</p></div>'
    else:
        table_html = ""

    return f"""<div class="section">
  <h2>{emoji} {title}</h2>
  <p><strong>整體狀態：</strong>
    <span class="status-badge status-{status}">
      {_status_label(status)}
    </span>
  </p>
  {table_html}
  <h3>評估發現</h3>
  <p>{findings}</p>
  <h3>優勢</h3>
  <ul>{list_html_fn(strengths)}</ul>
  <h3>關注事項</h3>
  <ul>{list_html_fn(concerns)}</ul>
  <h3>改善建議</h3>
  <ul>{list_html_fn(recommendations)}</ul>
</div>\n"""


def _build_html_report(report_data: Dict[str, Any], child_name: str, child_age_months: float) -> str:
    """Build a styled HTML string for the PDF report."""
    now_str = hk_now().strftime("%Y-%m-%d %H:%M HKT")
    age_years = child_age_months / 12
    age_display = f"{child_age_months:.0f} 個月（約 {age_years:.1f} 歲）"

    exec_summary = report_data.get("executive_summary", "未提供摘要")
    motor = report_data.get("motor_development", {})
    language = report_data.get("language_development", {})
    social_emotional = report_data.get("social_emotional", {})
    cognitive = report_data.get("cognitive", {})
    adaptive_behavior = report_data.get("adaptive_behavior", {})
    selfcare = report_data.get("selfcare", {})
    overall_recs = report_data.get("overall_recommendations", [])
    referral_needed = report_data.get("professional_referral_needed", False)
    referral_reason = report_data.get("referral_reason", "")

    def _list_html(items):
        if not items:
            return "<li>無</li>"
        if isinstance(items, str):
            return f"<li>{items}</li>"
        return "".join(f"<li>{item}</li>" for item in items)

    # Build dimension sections using the helper
    motor_html = _dimension_section_html("身體動作發展", "🏃", motor, _list_html)
    language_html = _dimension_section_html("語言發展", "🗣️", language, _list_html)
    social_html = _dimension_section_html("社交情緒發展", "👥", social_emotional, _list_html)
    cognitive_html = _dimension_section_html("認知發展", "🧠", cognitive, _list_html)
    adaptive_html = _dimension_section_html("適應性行為", "🔄", adaptive_behavior, _list_html)
    selfcare_html = _dimension_section_html("自理能力", "🧹", selfcare, _list_html)

    html = f"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>兒童發展影片分析報告 – {child_name}</title>
<style>
  @page {{ size: A4; margin: 2cm; }}
  body {{ font-family: "Noto Sans CJK TC", "Noto Sans TC", "Microsoft JhengHei", "PingFang TC",
         "Hiragino Sans GB", "WenQuanYi Micro Hei", "Source Han Sans TC", sans-serif;
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
  .standards-table {{ width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }}
  .standards-table th {{ background: #edf2f7; color: #2d3748; padding: 8px 10px; text-align: left;
                         border-bottom: 2px solid #cbd5e0; font-weight: bold; }}
  .standards-table td {{ padding: 6px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }}
  .standards-table tr:nth-child(even) {{ background: #f7fafc; }}
  .standards-table tr:hover {{ background: #edf2f7; }}
  .no-rag-notice {{ background: #fffbeb; border-left: 4px solid #f6ad55; padding: 10px 14px;
                     margin: 12px 0; border-radius: 4px; font-size: 10pt; color: #744210; }}
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

{motor_html}
{language_html}
{social_html}
{cognitive_html}
{adaptive_html}
{selfcare_html}

<div class="section">
  <h2>📌 整體建議</h2>
  <ul>{_list_html(overall_recs)}</ul>
</div>

{"<div class='referral'><h3>⚠️ 建議尋求專業評估</h3><p>" + str(referral_reason) + "</p></div>" if referral_needed else ""}

<div class="footer">
    <p>本報告由 Gemini AI 系統自動生成，僅供參考，不構成醫療診斷。如有疑慮請諮詢兒童發展專業人士。</p>
    <p>Generated by Steup Growth Child Development Analysis System • {now_str}</p>
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

        # Try weasyprint first (produces real PDF with CJK support)
        try:
            from weasyprint import HTML as WeasyprintHTML
            pdf_bytes = WeasyprintHTML(string=html_content).write_pdf()
            logger.info("PDF generated with weasyprint (%d bytes)", len(pdf_bytes))
        except ImportError:
            logger.warning("weasyprint not installed; trying xhtml2pdf fallback")
        except Exception as e:
            logger.warning("weasyprint failed: %s; trying xhtml2pdf fallback", e)

        # Second attempt: xhtml2pdf (pure-Python, no system deps)
        if not pdf_bytes:
            try:
                from xhtml2pdf import pisa
                result_io = io.BytesIO()
                pisa_status = pisa.CreatePDF(
                    io.StringIO(html_content),
                    dest=result_io,
                    encoding='utf-8',
                )
                if not pisa_status.err:
                    pdf_bytes = result_io.getvalue()
                    logger.info("PDF generated with xhtml2pdf (%d bytes)", len(pdf_bytes))
                else:
                    logger.warning("xhtml2pdf returned errors")
            except ImportError:
                logger.warning("xhtml2pdf not installed either")
            except Exception as e:
                logger.warning("xhtml2pdf failed: %s", e)

        # Always generate as PDF — only use HTML as last resort
        if pdf_bytes:
            filename = f"report_{report_id}.pdf"
            content_type = "application/pdf"
            file_data = pdf_bytes
        else:
            # Last fallback: save as HTML (still viewable / downloadable)
            logger.warning("All PDF generators failed; uploading HTML fallback")
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
