import io
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import app as cb  # noqa: E402


class AppTests(unittest.TestCase):
    def setUp(self):
        self.client = cb.app.test_client()

    def test_pages_load(self):
        for url in ("/", "/batch", "/about", "/api/health", "/api/model-info"):
            self.assertEqual(self.client.get(url).status_code, 200, url)

    def test_preprocess(self):
        self.assertEqual(cb.preprocess("Check THIS http://x.co @bob 123!!"), "check")

    def test_analyze_flags_sexism(self):
        r = self.client.post("/api/analyze", json={"text": "Women are terrible at everything, shut up bitch"}).get_json()
        self.assertTrue(r["flagged"])
        self.assertIn(r["category"], ("sexism", "gender", "gender_sexism"))
        self.assertAlmostEqual(sum(r["scores"].values()), 100, delta=0.5)

    def test_analyze_clear(self):
        r = self.client.post("/api/analyze", json={"text": "have a great day my friend"}).get_json()
        self.assertFalse(r["flagged"])

    def test_validation(self):
        self.assertEqual(self.client.post("/api/analyze", json={"text": "  "}).status_code, 400)
        self.assertEqual(self.client.post("/api/analyze", json={"text": "x" * 2001}).status_code, 400)
        self.assertEqual(self.client.post("/api/analyze", json={"text": "http://a.com 123"}).status_code, 422)

    def test_batch(self):
        data = {"file": (io.BytesIO(b"id,text\n1,have a great day\n2,all muslims are terrorists\n"), "t.csv")}
        r = self.client.post("/api/batch", data=data, content_type="multipart/form-data").get_json()
        self.assertEqual(r["total"], 2)
        self.assertEqual(r["flagged"], 1)

    def test_batch_without_file(self):
        self.assertEqual(self.client.post("/api/batch").status_code, 400)


if __name__ == "__main__":
    unittest.main()
