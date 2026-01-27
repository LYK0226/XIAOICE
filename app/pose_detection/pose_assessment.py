"""Pose assessment evaluator module.

This module contains the logic to evaluate a pose/action assessment run submitted
from the frontend. The function `evaluate_pose_assessment` returns a structured
report including per-step notes, advice, recommendations and an overall score.
"""
from datetime import datetime
from typing import Any, Dict, List


def evaluate_pose_assessment(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Richer deterministic scoring for pose/action assessment runs.

    Produces:
      - per-step: status, passed (bool), notes, advice
      - overall score & percent
      - recommendations list (actionable tips)

    Expected payload shape (minimal):
      {
        "steps": [
           {"key": "right_hand_up", "nameZh": "右手舉起", "status": "completed"|"skipped"|"failed", "target": {...}, "achieved": {...}},
           ...
        ]
      }
    """
    steps: List[Dict[str, Any]] = payload.get('steps') or []
    total = len(steps)

    completed = 0
    per_step: List[Dict[str, Any]] = []
    failures: List[str] = []

    for s in steps:
        key = s.get('key')
        name = s.get('nameZh') or s.get('name') or key
        status = (s.get('status') or ('completed' if s.get('completed') else None) or 'unknown').lower()

        # Default evaluation fields
        passed = False
        notes: List[str] = []
        advice: List[str] = []

        # Inspect reported achieved vs target, when available
        target = s.get('target') or {}
        achieved = s.get('achieved') or {}
        duration_ms = s.get('durationMs') or achieved.get('holdMs') or None

        if status == 'completed':
            passed = True
            notes.append('動作標記為完成')
        elif status == 'skipped':
            passed = False
            notes.append('使用者選擇跳過該步驟')
            advice.append('建議重試此動作以獲得更完整評估')
        else:
            # Try to infer from achieved vs target
            if target and achieved:
                # Check hold-based steps
                if target.get('holdMs'):
                    needed = int(target.get('holdMs'))
                    got = int(achieved.get('holdMs') or 0)
                    if got >= needed:
                        passed = True
                        notes.append(f'維持時間 {got}ms，達到目標 {needed}ms')
                    else:
                        notes.append(f'維持時間 {got}ms，未達到目標 {needed}ms')
                        advice.append('嘗試保持動作更久，或減慢動作速度以便偵測')
                # Check repetition-based steps
                elif target.get('repsTarget'):
                    needed = int(target.get('repsTarget'))
                    got = int(achieved.get('reps') or 0)
                    if got >= needed:
                        passed = True
                        notes.append(f'完成 {got} 次，達到目標 {needed} 次')
                    else:
                        notes.append(f'完成 {got} 次，少於目標 {needed} 次')
                        advice.append('確保每次動作完整，並讓鏡頭能完整看到上下肢')
                else:
                    notes.append('沒有足夠的目標/完成度資訊')
                    advice.append('請確保程式能捕捉到該動作的持續時間或次數')
            else:
                notes.append('無法確認是否完成；沒有提供完成資訊')
                advice.append('請嘗試重新執行動作並保持鏡頭能完整看見全身')

        if passed:
            completed += 1
        else:
            failures.append(key or name)

        # If camera/visibility related failures are suspected, suggest tips
        if not passed and not advice:
            advice.append('檢查鏡頭角度與光線，避免遮擋手腳')

        per_step.append({
            'key': key,
            'nameZh': name,
            'status': status,
            'passed': passed,
            'notes': notes,
            'advice': advice,
            'target': target,
            'achieved': achieved,
            'durationMs': duration_ms
        })

    percent = round((completed / total) * 100, 1) if total > 0 else 0.0

    # High-level recommendations based on failures
    recommendations: List[str] = []
    if total == 0:
        level = 'no_data'
        summary_zh = '沒有收到任何測驗步驟資料。'
        recommendations.append('請重新啟動測驗並確保已選擇追蹤對象')
    else:
        if percent >= 90:
            level = '優秀'
            summary_zh = '動作完成度很高，整體表現優秀。'
        elif percent >= 70:
            level = '好'
            summary_zh = '完成度良好，建議針對未完成動作加強練習。'
        elif percent >= 50:
            level = '普通'
            summary_zh = '完成度普通，請降低動作速度並確認鏡頭距離與全身入鏡。'
            recommendations.append('嘗試降低動作速度並遠一點放鏡頭以捕捉整個身體')
        else:
            level = '需要改進'
            summary_zh = '完成度偏低，建議先檢查環境與鏡頭，再從簡單動作練習。'
            recommendations.extend([
                '檢查光線是否充足',
                '確保鏡頭能完整看到頭、手與腳，避免遮擋',
                '先從保持類動作（hold）練習，再進行快速的重複動作'
            ])

    # Specific per-step advice summary (top 3)
    for p in per_step:
        if not p['passed'] and p['advice']:
            recommendations.append(f"{p['nameZh']}: {p['advice'][0]}")

    # Deduplicate recommendations while preserving order
    seen = set()
    dedup_recs: List[str] = []
    for r in recommendations:
        if r not in seen:
            dedup_recs.append(r)
            seen.add(r)

    return {
        'score': {
            'completed': completed,
            'total': total,
            'percent': percent,
        },
        'level': level,
        'summaryZh': summary_zh,
        'steps': per_step,
        'recommendations': dedup_recs,
        'failures': failures,
        'evaluatedAt': datetime.utcnow().isoformat(),
    }