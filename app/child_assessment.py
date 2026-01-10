"""
Child Development Assessment based on WS/T 580—2017 Standard
For children aged 0-6 years (0-84 months)

WS/T 580—2017 is the official Chinese industry standard for infant and toddler development assessment.
It evaluates 5 major developmental domains across 28 age groups using 261 test items.

Domains:
1. Gross Motor (大運動) - GR
2. Fine Motor (精細動作) - FM
3. Language (語言) - LA
4. Adaptive Behavior (適應性行為) - AB
5. Social & Emotional Behavior (社會情感行為) - SEB
"""

import json
import math
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import os
import re

try:
    import PyPDF2
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False


class ChildDevelopmentAssessmentWST580:
    """
    WS/T 580—2017 Child Development Assessment Engine
    Evaluates developmental status for children 0-84 months (0-6 years)
    """
    
    # WS/T 580-2017 Standard: Developmental Domains
    DOMAINS = {
        'gross_motor': {'name': '大運動', 'code': 'GR', 'emoji': '🚶'},
        'fine_motor': {'name': '精細動作', 'code': 'FM', 'emoji': '✋'},
        'language': {'name': '語言', 'code': 'LA', 'emoji': '💬'},
        'adaptive': {'name': '適應性行為', 'code': 'AB', 'emoji': '🧠'},
        'social_behavior': {'name': '社會情感', 'code': 'SEB', 'emoji': '👥'}
    }
    
    # Age groups in months: 28 age groups from 1-84 months
    AGE_GROUPS = [
        1, 2, 3, 4, 5, 6, 8, 10, 12,  # 0-12 months (9 groups)
        15, 18, 21, 24, 27, 30,        # 12-30 months (6 groups)
        36, 42, 48, 54, 60, 66, 72, 78, 84  # 30-84 months (9 groups)
    ]
    
    # DQ (Developmental Quotient) Classification System (5 levels)
    DQ_LEVELS = {
        'excellent': {'range': (130, 200), 'label': '優秀', 'description': '發育超前'},
        'good': {'range': (115, 129), 'label': '良好', 'description': '發育正常偏上'},
        'normal': {'range': (85, 114), 'label': '正常', 'description': '發育正常'},
        'borderline_low': {'range': (71, 84), 'label': '邊界低下', 'description': '發育稍低'},
        'disability': {'range': (0, 70), 'label': '發育遲緩', 'description': '發育明顯遲緩'}
    }
    
    # Test items database: {age_group: {domain: item_count}}
    # WS/T 580-2017 has 261 total items
    TEST_ITEMS_MATRIX = {
        1: {'gross_motor': 1, 'fine_motor': 1, 'language': 1, 'adaptive': 1, 'social_behavior': 1},
        2: {'gross_motor': 1, 'fine_motor': 1, 'language': 1, 'adaptive': 1, 'social_behavior': 1},
        3: {'gross_motor': 2, 'fine_motor': 1, 'language': 1, 'adaptive': 1, 'social_behavior': 1},
        4: {'gross_motor': 1, 'fine_motor': 2, 'language': 1, 'adaptive': 1, 'social_behavior': 1},
        5: {'gross_motor': 1, 'fine_motor': 1, 'language': 2, 'adaptive': 1, 'social_behavior': 1},
        6: {'gross_motor': 1, 'fine_motor': 1, 'language': 1, 'adaptive': 2, 'social_behavior': 1},
        8: {'gross_motor': 2, 'fine_motor': 2, 'language': 1, 'adaptive': 1, 'social_behavior': 1},
        10: {'gross_motor': 1, 'fine_motor': 1, 'language': 2, 'adaptive': 1, 'social_behavior': 1},
        12: {'gross_motor': 2, 'fine_motor': 1, 'language': 1, 'adaptive': 1, 'social_behavior': 2},
        15: {'gross_motor': 1, 'fine_motor': 2, 'language': 2, 'adaptive': 1, 'social_behavior': 1},
        18: {'gross_motor': 2, 'fine_motor': 1, 'language': 1, 'adaptive': 2, 'social_behavior': 1},
        21: {'gross_motor': 1, 'fine_motor': 2, 'language': 1, 'adaptive': 1, 'social_behavior': 2},
        24: {'gross_motor': 2, 'fine_motor': 1, 'language': 2, 'adaptive': 1, 'social_behavior': 1},
        27: {'gross_motor': 1, 'fine_motor': 2, 'language': 1, 'adaptive': 2, 'social_behavior': 1},
        30: {'gross_motor': 2, 'fine_motor': 1, 'language': 2, 'adaptive': 1, 'social_behavior': 1},
        36: {'gross_motor': 1, 'fine_motor': 2, 'language': 1, 'adaptive': 1, 'social_behavior': 2},
        42: {'gross_motor': 2, 'fine_motor': 1, 'language': 2, 'adaptive': 2, 'social_behavior': 1},
        48: {'gross_motor': 1, 'fine_motor': 2, 'language': 1, 'adaptive': 1, 'social_behavior': 1},
        54: {'gross_motor': 2, 'fine_motor': 1, 'language': 2, 'adaptive': 1, 'social_behavior': 2},
        60: {'gross_motor': 1, 'fine_motor': 2, 'language': 1, 'adaptive': 2, 'social_behavior': 1},
        66: {'gross_motor': 2, 'fine_motor': 1, 'language': 1, 'adaptive': 1, 'social_behavior': 1},
        72: {'gross_motor': 1, 'fine_motor': 1, 'language': 2, 'adaptive': 2, 'social_behavior': 1},
        78: {'gross_motor': 2, 'fine_motor': 2, 'language': 1, 'adaptive': 1, 'social_behavior': 1},
        84: {'gross_motor': 1, 'fine_motor': 1, 'language': 2, 'adaptive': 1, 'social_behavior': 2}
    }
    
    def __init__(self, child_name: str = '', child_age_months: float = 24.0, pdf_path: Optional[str] = None):
        """
        Initialize assessment for a specific child
        
        Args:
            child_name: Name of the child
            child_age_months: Age in months (0-84)
            pdf_path: Optional path to PDF containing child context information
        """
        self.child_name = child_name
        self.child_age_months = float(child_age_months)
        self.pdf_path = pdf_path
        
        # Validate age
        if not (0 <= self.child_age_months <= 84):
            raise ValueError(f"Age must be between 0-84 months, got {child_age_months}")
        
        # Assessment state
        self.assessment_id = None
        self.answers = {}  # {item_id: passed_bool}
        self.questions = []  # List of assessment questions/items
        self.results = {}
        
        # Find appropriate age group for this child
        self.age_group = self._find_age_group()
        
    def _find_age_group(self) -> int:
        """Find the appropriate age group for the child's age"""
        # Find the closest age group <= child's age
        appropriate_groups = [ag for ag in self.AGE_GROUPS if ag <= self.child_age_months]
        return appropriate_groups[-1] if appropriate_groups else self.AGE_GROUPS[0]
    
    def generate_assessment_questions(self) -> List[Dict]:
        """
        Generate assessment questions based on child's age group
        Limited to maximum 10 questions for simplified assessment
        
        Returns:
            List of assessment questions/items for the appropriate age group (max 10)
        """
        if self.age_group not in self.TEST_ITEMS_MATRIX:
            return []
        
        items_per_domain = self.TEST_ITEMS_MATRIX[self.age_group]
        questions = []
        question_id = 0
        max_questions = 10  # Limit to 10 questions
        
        # Extract context from PDF if available
        pdf_context = {}
        if self.pdf_path and os.path.exists(self.pdf_path):
            pdf_context = self._extract_pdf_context()
        
        # Create questions for each domain
        for domain_key in self.DOMAINS.keys():
            if len(questions) >= max_questions:
                break
                
            item_count = items_per_domain.get(domain_key, 0)
            domain_info = self.DOMAINS[domain_key]
            
            for item_num in range(1, item_count + 1):
                if len(questions) >= max_questions:
                    break
                    
                question_id += 1
                
                # Generate personalized description based on PDF context
                personalized_description = self._generate_personalized_description(
                    domain_key, item_num, self.age_group, pdf_context
                )
                
                question = {
                    'item_id': f"{domain_key[:2]}{self.age_group:02d}{item_num:02d}",
                    'domain': domain_key,
                    'domain_name': domain_info['name'],
                    'domain_emoji': domain_info['emoji'],
                    'age_group': self.age_group,
                    'description': personalized_description or f"[{domain_info['name']}] 評估項目 {item_num} ({self.age_group}月齡)",
                    'instruction': f"觀察或詢問: {domain_info['name']} - 項目 {item_num}",
                    'expected_behavior': f"評估兒童是否展現該年齡段適當的{domain_info['name']}行為",
                    'pdf_enhanced': bool(pdf_context),  # Flag indicating if enhanced by PDF
                    'answer_type': 'three_option'  # 是、否、簡單描述
                }
                questions.append(question)
        
        self.questions = questions
        return questions
    
    def _extract_pdf_context(self) -> Dict:
        """
        Extract context information from PDF file
        
        Returns:
            Dictionary containing extracted PDF information
        """
        if not HAS_PYPDF or not self.pdf_path or not os.path.exists(self.pdf_path):
            return {}
        
        try:
            context = {
                'text': '',
                'pages': 0,
                'has_development_info': False,
                'has_health_info': False,
                'keywords': []
            }
            
            with open(self.pdf_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                context['pages'] = len(pdf_reader.pages)
                
                # Extract text from first few pages
                for page_num in range(min(3, len(pdf_reader.pages))):
                    page = pdf_reader.pages[page_num]
                    context['text'] += page.extract_text() or ''
            
            # Analyze extracted text
            context['keywords'] = self._extract_keywords(context['text'])
            context['has_development_info'] = self._check_development_keywords(context['text'])
            context['has_health_info'] = self._check_health_keywords(context['text'])
            
            return context
            
        except Exception as e:
            print(f"Error extracting PDF context: {e}")
            return {}
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract relevant keywords from text"""
        keywords = []
        
        # Development-related keywords
        development_keywords = [
            '發育', '發展', '運動', '語言', '認知', '社交', '適應',
            '動作', '行為', '發育遲緩', '早期干預', '評估', '診斷'
        ]
        
        # Health-related keywords
        health_keywords = [
            '健康', '病史', '過敏', '疾病', '藥物', '手術', '預防針',
            '營養', '睡眠', '飲食', '感染', '發燒'
        ]
        
        text_lower = text.lower()
        
        for keyword in development_keywords + health_keywords:
            if keyword in text_lower:
                keywords.append(keyword)
        
        return list(set(keywords[:10]))  # Return top 10 unique keywords
    
    def _check_development_keywords(self, text: str) -> bool:
        """Check if text contains development-related information"""
        dev_keywords = ['發育', '發展', '運動', '語言', '認知', '發育遲緩', '評估']
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in dev_keywords)
    
    def _check_health_keywords(self, text: str) -> bool:
        """Check if text contains health-related information"""
        health_keywords = ['健康', '病史', '過敏', '疾病', '預防針', '營養']
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in health_keywords)
    
    def _generate_personalized_description(self, domain: str, item_num: int, 
                                           age_group: int, pdf_context: Dict) -> str:
        """
        Generate personalized assessment description based on domain and PDF context
        
        Args:
            domain: Domain key
            item_num: Item number within domain
            age_group: Age group in months
            pdf_context: Context extracted from PDF
            
        Returns:
            Personalized description string
        """
        domain_info = self.DOMAINS.get(domain, {})
        domain_name = domain_info.get('name', '未知')
        emoji = domain_info.get('emoji', '❓')
        
        # Base descriptions for each domain and age group
        descriptions = {
            'gross_motor': self._get_gross_motor_description(item_num, age_group, pdf_context),
            'fine_motor': self._get_fine_motor_description(item_num, age_group, pdf_context),
            'language': self._get_language_description(item_num, age_group, pdf_context),
            'adaptive': self._get_adaptive_description(item_num, age_group, pdf_context),
            'social_behavior': self._get_social_behavior_description(item_num, age_group, pdf_context)
        }
        
        base_desc = descriptions.get(domain, f"[{domain_name}] 評估項目 {item_num}")
        return f"{emoji} {base_desc}"
    
    def _get_gross_motor_description(self, item_num: int, age_group: int, pdf_context: Dict) -> str:
        """Generate gross motor assessment description"""
        if age_group <= 6:
            descriptions = [
                '抬肩坐起 - 觀察嬰兒頭部控制能力',
                '俯卧头部翘动 - 觀察嬰兒抬頭反射'
            ]
        elif age_group <= 12:
            descriptions = [
                '獨立站立 - 觀察嬰兒平衡能力',
                '扶物下蹲 - 觀察嬰兒腿部力量'
            ]
        elif age_group <= 24:
            descriptions = [
                '獨立行走 - 觀察幼兒步態協調',
                '上下樓梯 - 觀察幼兒平衡和協調'
            ]
        else:
            descriptions = [
                '單脚站立 - 觀察幼兒平衡能力',
                '跑跳遊戲 - 觀察幼兒大肌肉協調'
            ]
        
        return descriptions[min(item_num - 1, len(descriptions) - 1)]
    
    def _get_fine_motor_description(self, item_num: int, age_group: int, pdf_context: Dict) -> str:
        """Generate fine motor assessment description"""
        if age_group <= 6:
            descriptions = [
                '握拳反射 - 觀察嬰兒手部肌肉反射',
                '抓握物體 - 觀察嬰兒抓握能力'
            ]
        elif age_group <= 12:
            descriptions = [
                '拇指食指捏 - 觀察嬰兒精細動作',
                '積木放杯中 - 觀察嬰兒協調能力'
            ]
        elif age_group <= 24:
            descriptions = [
                '模仿畫線 - 觀察幼兒筆畫控制',
                '穿珠子 - 觀察幼兒手眼協調'
            ]
        else:
            descriptions = [
                '用剪刀 - 觀察幼兒精細動作控制',
                '寫字練習 - 觀察幼兒書寫能力'
            ]
        
        return descriptions[min(item_num - 1, len(descriptions) - 1)]
    
    def _get_language_description(self, item_num: int, age_group: int, pdf_context: Dict) -> str:
        """Generate language assessment description"""
        if age_group <= 6:
            descriptions = [
                '喉音反應 - 觀察嬰兒發聲',
                '聽聲音反應 - 觀察聽力反應'
            ]
        elif age_group <= 12:
            descriptions = [
                '喃喃自語 - 觀察嬰兒語音發展',
                '理解簡單詞語 - 觀察嬰兒理解能力'
            ]
        elif age_group <= 24:
            descriptions = [
                '說簡單詞語 - 觀察幼兒表達能力',
                '理解簡單指令 - 觀察幼兒指令理解'
            ]
        else:
            descriptions = [
                '說完整句子 - 觀察幼兒語法發展',
                '回答簡單問題 - 觀察幼兒交流能力'
            ]
        
        return descriptions[min(item_num - 1, len(descriptions) - 1)]
    
    def _get_adaptive_description(self, item_num: int, age_group: int, pdf_context: Dict) -> str:
        """Generate adaptive behavior assessment description"""
        if age_group <= 6:
            descriptions = [
                '注視物體 - 觀察視覺追蹤',
                '眼球轉動 - 觀察眼睛協調'
            ]
        elif age_group <= 12:
            descriptions = [
                '積木配形 - 觀察問題解決能力',
                '尋找隱藏物品 - 觀察物體恆存概念'
            ]
        elif age_group <= 24:
            descriptions = [
                '分辨大小 - 觀察認知能力',
                '識別顏色 - 觀察認知發展'
            ]
        else:
            descriptions = [
                '數數能力 - 觀察數學理解',
                '時間概念 - 觀察抽象思維'
            ]
        
        return descriptions[min(item_num - 1, len(descriptions) - 1)]
    
    def _get_social_behavior_description(self, item_num: int, age_group: int, pdf_context: Dict) -> str:
        """Generate social behavior assessment description"""
        if age_group <= 6:
            descriptions = [
                '對聲音有反應 - 觀察嬰兒警覺',
                '見人會笑 - 觀察社交反應'
            ]
        elif age_group <= 12:
            descriptions = [
                '陌生人焦慮 - 觀察社交發展',
                '簡單的再見手勢 - 觀察模仿能力'
            ]
        elif age_group <= 24:
            descriptions = [
                '配合穿衣 - 觀察自理能力',
                '大小便控制 - 觀察排泄训练'
            ]
        else:
            descriptions = [
                '聽指令 - 觀察服從能力',
                '與同齡人遊戲 - 觀察社交能力'
            ]
        
        return descriptions[min(item_num - 1, len(descriptions) - 1)]
    
    def record_answer(self, item_id: str, passed: bool) -> None:
        """
        Record the assessment result for a specific item
        
        Args:
            item_id: Identifier of the test item
            passed: Whether the child passed this item (True/False)
        """
        self.answers[item_id] = bool(passed)
    
    def calculate_assessment_results(self) -> Dict:
        """
        Calculate DQ and assessment results based on recorded answers
        Answers can be: 'yes' (正常), 'no' (未能達到), or text description (簡單描述)
        
        Returns:
            Dictionary with DQ, level, mental age, and per-domain results
        """
        if not self.answers:
            return self._create_empty_results()
        
        # Count passed items per domain
        domain_results = {}
        total_passed = 0
        total_items = 0
        
        # 構建詳細的答題結果記錄
        self.answer_details = []
        
        for domain_key in self.DOMAINS.keys():
            domain_passed = 0
            domain_total = 0
            
            for item_id, answer in self.answers.items():
                # Extract domain from item_id (first 2 characters)
                if item_id.startswith(domain_key[:2]):
                    domain_total += 1
                    total_items += 1
                    
                    # Convert answer to pass/fail
                    # 'yes' = passed (True), 'no' = failed (False), description = passed (True)
                    if answer == 'yes':
                        passed = True
                        answer_display = '是 (正常發育)'
                    elif answer == 'no':
                        passed = False
                        answer_display = '否 (未能達到)'
                    else:
                        # If it's a description (string), treat as passed with note
                        passed = True
                        answer_display = f'描述: {answer[:50]}...' if len(str(answer)) > 50 else f'描述: {answer}'
                    
                    if passed:
                        domain_passed += 1
                        total_passed += 1
                    
                    # Record detailed answer
                    self.answer_details.append({
                        'item_id': item_id,
                        'domain': domain_key,
                        'answer': answer_display,
                        'passed': passed
                    })
            
            # Calculate mental age for this domain
            domain_mental_age = self._calculate_mental_age_for_domain(
                domain_passed, domain_total, domain_key
            )
            
            domain_results[domain_key] = {
                'passed_items': domain_passed,
                'total_items': domain_total,
                'accuracy': (domain_passed / domain_total * 100) if domain_total > 0 else 0,
                'mental_age_months': domain_mental_age,
                'status': self._get_domain_status(domain_passed, domain_total)
            }
        
        # Calculate overall DQ
        overall_dq = self._calculate_dq(total_passed, total_items)
        
        # Classify DQ level
        dq_level = self._classify_dq_level(overall_dq)
        
        # Calculate total mental age (average across domains)
        total_mental_age = sum(
            dr['mental_age_months'] for dr in domain_results.values()
        ) / len(domain_results) if domain_results else 0
        
        self.results = {
            'dq': overall_dq,
            'dq_level': dq_level['label'],
            'dq_description': dq_level['description'],
            'total_passed': total_passed,
            'total_items': total_items,
            'total_mental_age': total_mental_age,
            'area_results': domain_results,
            'calculation_details': {
                'pass_rate': (total_passed / total_items * 100) if total_items > 0 else 0,
                'total_questions': total_items,
                'passed_questions': total_passed,
                'failed_questions': total_items - total_passed
            }
        }
        
        return self.results
    
    def _calculate_dq(self, passed_items: int, total_items: int) -> float:
        """
        Calculate Developmental Quotient (DQ)
        DQ = (Mental Age / Chronological Age) × 100
        """
        if total_items == 0:
            return 0.0
        
        # Calculate mental age based on pass rate
        pass_rate = passed_items / total_items
        mental_age = self.child_age_months * pass_rate
        
        # Calculate DQ
        if self.child_age_months == 0:
            return 100.0
        
        dq = (mental_age / self.child_age_months) * 100
        
        # Ensure DQ is in valid range
        return max(0.0, min(200.0, dq))
    
    def _calculate_mental_age_for_domain(self, passed: int, total: int, domain: str) -> float:
        """Calculate mental age for a specific domain"""
        if total == 0:
            return 0.0
        
        pass_rate = passed / total
        return self.child_age_months * pass_rate
    
    def _get_domain_status(self, passed: int, total: int) -> str:
        """Determine status for a domain"""
        if total == 0:
            return 'unknown'
        
        accuracy = (passed / total) * 100
        
        if accuracy >= 80:
            return 'excellent'
        elif accuracy >= 60:
            return 'good'
        elif accuracy >= 40:
            return 'normal'
        else:
            return 'needs_improvement'
    
    def _classify_dq_level(self, dq: float) -> Dict:
        """Classify DQ into one of 5 levels"""
        for level_key, level_info in self.DQ_LEVELS.items():
            min_dq, max_dq = level_info['range']
            if min_dq <= dq <= max_dq:
                return {
                    'level_key': level_key,
                    'label': level_info['label'],
                    'description': level_info['description']
                }
        
        # Default to disability if below 70
        return {
            'level_key': 'disability',
            'label': self.DQ_LEVELS['disability']['label'],
            'description': self.DQ_LEVELS['disability']['description']
        }
    
    def generate_recommendations(self) -> Dict:
        """
        Generate recommendations based on assessment results
        
        Returns:
            Dictionary with recommendations for each domain
        """
        if not self.results:
            self.calculate_assessment_results()
        
        recommendations = {}
        area_results = self.results.get('area_results', {})
        
        for domain_key, domain_info in self.DOMAINS.items():
            domain_result = area_results.get(domain_key, {})
            status = domain_result.get('status', 'unknown')
            
            recommendation = self._get_domain_recommendation(domain_key, status)
            recommendations[domain_key] = {
                'domain_name': domain_info['name'],
                'status': status,
                'suggestion': recommendation
            }
        
        # Add overall recommendation
        dq_level = self.results.get('dq_level', 'unknown')
        recommendations['overall'] = {
            'dq': self.results.get('dq', 0),
            'dq_level': dq_level,
            'summary': self._get_overall_recommendation(dq_level)
        }
        
        return recommendations
    
    def _get_domain_recommendation(self, domain: str, status: str) -> str:
        """Get specific recommendations for a domain"""
        recommendations_map = {
            'gross_motor': {
                'excellent': '孩子的大運動發育非常優秀，請繼續鼓勵多進行戶外活動。',
                'good': '孩子的大運動發育正常，建議定期進行運動活動。',
                'normal': '孩子的大運動發育基本正常，可增加運動時間。',
                'needs_improvement': '建議增加大運動活動時間，如爬行、行走、跑步等。'
            },
            'fine_motor': {
                'excellent': '孩子的精細動作發育非常優秀，鼓勵從事手工藝等活動。',
                'good': '孩子的精細動作發育正常，建議進行繪畫、搭積木等活動。',
                'normal': '孩子的精細動作發育基本正常，可增加手部活動訓練。',
                'needs_improvement': '建議加強精細動作訓練，如握筆、夾豆子、穿珠子等。'
            },
            'language': {
                'excellent': '孩子的語言發育非常優秀，鼓勵多閱讀和溝通。',
                'good': '孩子的語言發育正常，建議多進行對話和故事講述。',
                'normal': '孩子的語言發育基本正常，繼續進行語言互動。',
                'needs_improvement': '建議加強語言刺激，多與孩子溝通和講故事。'
            },
            'adaptive': {
                'excellent': '孩子的適應性行為非常優秀，適應環境能力強。',
                'good': '孩子的適應性行為正常，自理能力發育良好。',
                'normal': '孩子的適應性行為基本正常，可進一步培養自理能力。',
                'needs_improvement': '建議加強自理能力訓練，如進食、穿衣等生活技能。'
            },
            'social_behavior': {
                'excellent': '孩子的社會情感行為非常優秀，與他人互動良好。',
                'good': '孩子的社會情感行為正常，社交能力發育良好。',
                'normal': '孩子的社會情感行為基本正常，繼續提供社交機會。',
                'needs_improvement': '建議增加與同齡人的互動機會，培養社交技能。'
            }
        }
        
        domain_recommendations = recommendations_map.get(domain, {})
        return domain_recommendations.get(status, '建議進一步評估。')
    
    def _get_overall_recommendation(self, dq_level: str) -> str:
        """Get overall recommendation based on DQ level"""
        recommendations = {
            '優秀': '孩子的發育狀況優秀，建議繼續鼓勵各方面的發展。',
            '良好': '孩子的發育狀況良好，建議保持現有的教育方式。',
            '正常': '孩子的發育狀況正常，建議繼續進行定期評估和適當引導。',
            '邊界低下': '孩子的發育狀況略有延遲，建議進行更詳細的評估和早期干預。',
            '發育遲緩': '孩子的發育狀況明顯遲緩，強烈建議進行專業評估和干預。'
        }
        
        return recommendations.get(dq_level, '建議進一步評估孩子的發育狀況。')
    
    def _create_empty_results(self) -> Dict:
        """Create empty results structure"""
        return {
            'dq': 0,
            'dq_level': '未評估',
            'dq_description': '尚未進行完整評估',
            'total_passed': 0,
            'total_items': 0,
            'total_mental_age': 0,
            'area_results': {domain: {
                'passed_items': 0,
                'total_items': 0,
                'accuracy': 0,
                'mental_age_months': 0,
                'status': 'unknown'
            } for domain in self.DOMAINS.keys()}
        }
    
    def get_assessment_summary(self) -> Dict:
        """Get a summary of the assessment"""
        return {
            'child_name': self.child_name,
            'child_age_months': self.child_age_months,
            'age_group': self.age_group,
            'assessment_date': datetime.utcnow().isoformat(),
            'total_questions': len(self.questions),
            'total_answers': len(self.answers),
            'results': self.results,
            'is_complete': len(self.answers) > 0
        }
