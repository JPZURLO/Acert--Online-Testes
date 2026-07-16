import unittest
from pathlib import Path


class ExamStepperTests(unittest.TestCase):
    def test_stepper_is_sticky_and_sections_have_scroll_offset(self):
        css = Path("front-end/css/styleTelaCliente.css").read_text(encoding="utf-8")
        self.assertIn(".stepper { position: sticky; top: 68px", css)
        self.assertIn(".stepper.is-stuck", css)
        self.assertIn("#exam-information, #questions-section, #application-settings, #branding-panel { scroll-margin-top: 150px; }", css)

    def test_stepper_tracks_scroll_and_updates_accessibility(self):
        javascript = Path("front-end/js/company-dashboard.js").read_text(encoding="utf-8")
        self.assertIn("function updateActiveStep()", javascript)
        self.assertIn("function navigateToStep(button)", javascript)
        self.assertIn("aria-current", javascript)
        self.assertIn("window.addEventListener('scroll', scheduleStepUpdate", javascript)


if __name__ == "__main__":
    unittest.main()
