import sys
import os
import unittest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.activity_intelligence import (
    parse_report_text,
    match_l5_l6_activity,
    convert_time_to_24h
)

class MockActivity:
    def __init__(self, id, activity_id, name, l5_name, l6_name, discipline):
        self.id = id
        self.activity_id = activity_id
        self.name = name
        self.l5_name = l5_name
        self.l6_name = l6_name
        self.discipline = discipline


class TestActivityIntelligence(unittest.TestCase):

    def test_convert_time_to_24h(self):
        self.assertEqual(convert_time_to_24h("9 AM"), "09:00")
        self.assertEqual(convert_time_to_24h("5 PM"), "17:00")
        self.assertEqual(convert_time_to_24h("12 PM"), "12:00")
        self.assertEqual(convert_time_to_24h("08:30 am"), "08:30")
        self.assertEqual(convert_time_to_24h("16:45"), "16:45")

    def test_parse_report_text_full(self):
        text = "Today we completed around 70% of reinforcement work for Pier P3. Started at 9 AM and finished at 5 PM."
        extracted = parse_report_text(text)
        self.assertEqual(extracted["actual_start"], "09:00")
        self.assertEqual(extracted["actual_end"], "17:00")
        self.assertEqual(extracted["extracted_progress"], 70.0)

    def test_parse_report_text_single_time(self):
        text = "Started column reinforcement today."
        extracted = parse_report_text(text)
        self.assertIn(extracted["actual_start"], ["today", None])
        self.assertIsNone(extracted["actual_end"])

    def test_parse_report_text_quantity_and_unit(self):
        text = "Completed 120 meters of pipeline installation."
        extracted = parse_report_text(text)
        self.assertEqual(extracted["quantity"], 120.0)
        self.assertEqual(extracted["unit"], "meters")

    def test_parse_report_text_ratio_progress(self):
        text = "Completed 3 out of 5 columns today."
        extracted = parse_report_text(text)
        self.assertEqual(extracted["extracted_progress"], 60.0)
        self.assertEqual(extracted["quantity"], 3.0)

    def test_match_high_confidence(self):
        activities = [
            MockActivity("act-1", "CIV-034", "Pier Reinforcement Installation", "Pier Construction", "Pier Reinforcement Installation", "Civil Works"),
            MockActivity("act-2", "L6-03-02", "Pier Formwork Installation", "Pier Construction", "Pier Formwork Installation", "Civil Works"),
            MockActivity("act-3", "PIP-001", "Erect Line 24-XX Spool", "Pipe Rack Spool Erection", "Erect Line 24-XX Spool", "Piping Works")
        ]

        text = "Today we completed around 70% of reinforcement work for Pier P3."
        matched_act, confidence, candidates, reasoning, status = match_l5_l6_activity(text, activities, threshold=0.80)

        self.assertIsNotNone(matched_act)
        self.assertEqual(matched_act.activity_id, "CIV-034")
        self.assertGreaterEqual(confidence, 0.80)
        self.assertEqual(status, "Automatically Matched")

    def test_match_low_confidence_unmatched(self):
        activities = [
            MockActivity("act-1", "CIV-034", "Pier Reinforcement Installation", "Pier Construction", "Pier Reinforcement Installation", "Civil Works"),
            MockActivity("act-2", "L6-03-02", "Pier Formwork Installation", "Pier Construction", "Pier Formwork Installation", "Civil Works")
        ]

        text = "Pier P3 shuttering adjustment"
        matched_act, confidence, candidates, reasoning, status = match_l5_l6_activity(text, activities, threshold=0.80)

        self.assertIn(status, ["Pending Review", "Unmatched"])
        self.assertLess(confidence, 0.80)
        self.assertGreater(len(candidates), 0)


if __name__ == "__main__":
    unittest.main()
