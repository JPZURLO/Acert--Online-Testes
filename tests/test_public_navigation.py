import unittest
from html.parser import HTMLParser
from pathlib import Path


class HeaderCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.public_headers = 0
        self.login_menus = 0

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        classes = values.get("class", "").split()
        if tag == "header" and "public-header" in classes:
            self.public_headers += 1
        if tag == "ul" and "public-login-menu" in classes:
            self.login_menus += 1


class PublicNavigationTests(unittest.TestCase):
    pages = ("index.html", "QuemSomos.html", "solucoes.html", "NossosPlanos.html")

    def test_all_public_pages_use_the_same_versioned_navigation(self):
        header_fragments = []
        for page in self.pages:
            html = Path("front-end", page).read_text(encoding="utf-8")
            parser = HeaderCollector()
            parser.feed(html)
            self.assertEqual(parser.public_headers, 1, page)
            self.assertEqual(parser.login_menus, 1, page)
            self.assertIn("./css/public-navigation.css?v=5", html)
            self.assertIn("./js/public-navigation.js?v=3", html)
            self.assertIn('name="viewport"', html)
            start = html.index('<header class="public-header">')
            end = html.index("</header>", start) + len("</header>")
            header_fragments.append(html[start:end])
        self.assertTrue(all(fragment == header_fragments[0] for fragment in header_fragments))

    def test_dropdown_is_absolute_and_page_cannot_overflow_horizontally(self):
        css = Path("front-end/css/public-navigation.css").read_text(encoding="utf-8")
        self.assertIn("overflow-x: hidden", css)
        self.assertIn(".public-login-menu", css)
        self.assertIn("position: absolute", css)
        self.assertIn("top: calc(100% + 8px)", css)
        self.assertIn("right: 0", css)
        self.assertIn("pointer-events: none", css)

    def test_login_menu_and_active_page_behaviour(self):
        javascript = Path("front-end/js/public-navigation.js").read_text(encoding="utf-8")
        self.assertIn("setPublicLoginMenu", javascript)
        self.assertIn("aria-expanded", javascript)
        self.assertIn("event.key === 'Escape'", javascript)
        self.assertIn("event.target.closest('.public-login-dropdown')", javascript)
        self.assertIn("aria-current", javascript)
        self.assertIn("currentPage", javascript)

    def test_mobile_navigation_uses_a_five_column_grid_without_scrolling(self):
        css = Path("front-end/css/public-navigation.css").read_text(encoding="utf-8")
        self.assertIn("grid-template-columns: repeat(5, minmax(0, 1fr))", css)
        self.assertIn("overflow: visible", css)
        self.assertIn("flex-direction: column", css)


if __name__ == "__main__":
    unittest.main()
