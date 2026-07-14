import unittest
from pathlib import Path


class HomeNavigationTests(unittest.TestCase):
    def test_home_uses_isolated_navigation_assets_and_accessible_trigger(self):
        html = Path("front-end/index.html").read_text(encoding="utf-8")
        self.assertIn('name="viewport"', html)
        self.assertIn('class="site-header"', html)
        self.assertIn('class="site-navigation"', html)
        self.assertIn('class="navigation-list"', html)
        self.assertIn('aria-haspopup="true"', html)
        self.assertIn('aria-expanded="false"', html)
        self.assertIn("./css/home-navigation.css", html)
        self.assertIn("./js/home-navigation.js", html)
        self.assertNotIn('id="Opcoes-login"', html)

    def test_dropdown_is_overlaid_and_does_not_change_header_height(self):
        css = Path("front-end/css/home-navigation.css").read_text(encoding="utf-8")
        self.assertIn("min-height: 78px", css)
        self.assertIn("position: absolute", css)
        self.assertIn("top: calc(100% + 8px)", css)
        self.assertIn("z-index: 110", css)
        self.assertIn("visibility: hidden", css)
        self.assertIn("pointer-events: none", css)

    def test_dropdown_closes_outside_and_with_escape(self):
        javascript = Path("front-end/js/home-navigation.js").read_text(encoding="utf-8")
        self.assertIn("setLoginMenu", javascript)
        self.assertIn("aria-expanded", javascript)
        self.assertIn("event.key === 'Escape'", javascript)
        self.assertIn("event.target.closest('.site-navigation .dropdown')", javascript)


if __name__ == "__main__":
    unittest.main()
