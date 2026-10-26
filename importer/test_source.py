import unittest
from source import snapshot_from_page
class SourceTests(unittest.TestCase):
 def test_latest_resolves_to_newest_snapshot_with_a_checksum(self):
  html='<a href="germany-261024.osm.pbf.md5">checksum</a><a href="germany-261025.osm.pbf.md5">checksum</a><a href="germany-261026.osm.pbf">not ready</a>'
  self.assertEqual(snapshot_from_page('https://download.geofabrik.de/europe/germany-latest.osm.pbf',html),'https://download.geofabrik.de/europe/germany-261025.osm.pbf')
 def test_regional_path_and_explicit_snapshot_are_preserved(self):
  self.assertEqual(snapshot_from_page('https://download.geofabrik.de/europe/germany/bremen-latest.osm.pbf','<a href="bremen-261025.osm.pbf.md5">ok</a>'),'https://download.geofabrik.de/europe/germany/bremen-261025.osm.pbf')
  url='https://download.geofabrik.de/europe/germany-261025.osm.pbf'
  self.assertEqual(snapshot_from_page(url,''),url)
 def test_missing_published_checksum_fails_before_large_download(self):
  with self.assertRaises(ValueError):snapshot_from_page('https://download.geofabrik.de/europe/germany-latest.osm.pbf','<a href="germany-261025.osm.pbf">no checksum</a>')
if __name__=='__main__':unittest.main()
