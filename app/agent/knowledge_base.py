"""
RAG Knowledge Base for XIAOICE

This module contains developmental milestone data and RAG-related knowledge
for child development assessment and analysis.
"""

from typing import Dict, Any, List, Optional

# Developmental milestone data (RAG source)
DEVELOPMENTAL_STANDARDS: Dict[str, Dict[str, Any]] = {
    "0-6": {
        "age_range": "0–6 months",
        "gross_motor": [
            "Head control when held upright",
            "Rolls from back to side",
            "Pushes up on forearms in prone position",
        ],
        "fine_motor": [
            "Grasps objects placed in hand",
            "Reaches for objects",
            "Brings hands to midline",
        ],
        "language": [
            "Coos and makes vowel sounds",
            "Startles to loud sounds",
            "Turns head toward sounds",
        ],
        "social": [
            "Social smile",
            "Recognises caregiver's face",
            "Responds to voices",
        ],
    },
    "6-12": {
        "age_range": "6–12 months",
        "gross_motor": [
            "Sits independently without support",
            "Crawls on hands and knees",
            "Pulls to standing using furniture",
        ],
        "fine_motor": [
            "Transfers objects between hands",
            "Uses pincer grasp (thumb and index finger)",
            "Bangs two objects together",
        ],
        "language": [
            "Babbles with consonant-vowel combinations (ba-ba, da-da)",
            "Responds to simple verbal requests",
            "Understands 'no'",
        ],
        "social": [
            "Stranger anxiety appears",
            "Waves bye-bye",
            "Plays simple interactive games (peek-a-boo)",
        ],
    },
    "12-18": {
        "age_range": "12–18 months",
        "gross_motor": [
            "Walks independently",
            "Stoops to pick up objects",
            "Climbs onto furniture with assistance",
        ],
        "fine_motor": [
            "Stacks 2-3 blocks",
            "Turns pages of a board book",
            "Scribbles with a crayon",
        ],
        "language": [
            "Says 3-5 words besides 'mama/dada'",
            "Follows simple commands with gestures",
            "Points to familiar objects when named",
        ],
        "social": [
            "Shows independence and says 'no'",
            "Plays alongside other children",
            "Shows affection to caregivers",
        ],
    },
    "18-24": {
        "age_range": "18–24 months",
        "gross_motor": [
            "Runs with better coordination",
            "Kicks a ball forward",
            "Walks up stairs with hand held",
        ],
        "fine_motor": [
            "Stacks 4-6 blocks",
            "Turns pages of a book one at a time",
            "Uses a spoon to feed self",
        ],
        "language": [
            "Vocabulary of 50+ words",
            "Combines two words ('more milk', 'daddy go')",
            "Follows two-step instructions",
        ],
        "social": [
            "Parallel play increases",
            "Begins to show defiant behavior",
            "Imitates others, especially adults",
        ],
    },
    "24-36": {
        "age_range": "24–36 months",
        "gross_motor": [
            "Jumps with both feet off the ground",
            "Climbs well",
            "Pedals a tricycle",
        ],
        "fine_motor": [
            "Builds tower of 6+ blocks",
            "Turns book pages individually",
            "Completes simple puzzles",
        ],
        "language": [
            "Sentences of 3-4 words",
            "Uses pronouns (I, you, me)",
            "Names friends and familiar things",
        ],
        "social": [
            "Interactive play begins",
            "Takes turns in games",
            "Shows concern when others are upset",
        ],
    },
    "36-48": {
        "age_range": "36–48 months",
        "gross_motor": [
            "Climbs playground equipment confidently",
            "Rides tricycle or bicycle with training wheels",
            "Walks backwards",
        ],
        "fine_motor": [
            "Copies circles and vertical lines",
            "Uses scissors to cut paper",
            "Dresses self with minimal help",
        ],
        "language": [
            "Speaks in sentences of 4-5 words",
            "Tells simple stories",
            "Knows age and full name",
        ],
        "social": [
            "Cooperative play with other children",
            "Understands sharing (may still struggle)",
            "Shows a wider range of emotions",
        ],
    },
    "48-60": {
        "age_range": "48–60 months",
        "gross_motor": [
            "Hops on one foot",
            "Catches bounced ball",
            "Swing and climb with good coordination",
        ],
        "fine_motor": [
            "Draws recognizable shapes (circle, square, triangle)",
            "Writes some letters and numbers",
            "Buttons large buttons independently",
        ],
        "language": [
            "Speaks clearly enough to be understood",
            "Tells longer stories",
            "Uses future tense",
        ],
        "social": [
            "Cooperative play is preferred",
            "Understands rules of games",
            "Better at taking turns",
        ],
    },
    "60-72": {
        "age_range": "60–72 months (5-6 years)",
        "gross_motor": [
            "Skips or alternates feet jumping",
            "Has good balance",
            "Can swim or paddle with assistance",
        ],
        "fine_motor": [
            "Prints letters and numbers legibly",
            "Uses utensils to eat independently",
            "Ties basic knots",
        ],
        "language": [
            "Speaks in complex sentences",
            "Can retell stories in order",
            "Understands opposites and analogies",
        ],
        "social": [
            "Friendships become more important",
            "Understands fairness and rules",
            "Shows empathy and concern",
        ],
    },
}