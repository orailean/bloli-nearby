"""Run source preparation with offline tool stand-ins and temporary data paths."""
import hashlib
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path


class PrepareTests(unittest.TestCase):
    def test_retained_mode_fails_before_network_if_sources_are_missing(self):
        with tempfile.TemporaryDirectory() as directory:
            result=subprocess.run(['sh',str(Path(__file__).with_name('prepare.sh'))],env={**os.environ,'DATA_ROOT':directory,'COUNTRY_CODE':'ro','USE_RETAINED_SOURCE':'1'},text=True,capture_output=True)
            self.assertNotEqual(result.returncode,0)
            self.assertIn('MISSING_RETAINED_SOURCE',result.stderr)

    def test_new_filters_invalidate_old_cache_and_keep_verified_source(self):
        self.check_preparation()

    def test_retained_country_source_never_downloads_or_uses_germany_provenance(self):
        self.check_preparation(retained=True, country='ro')

    def check_preparation(self, retained=False, country='de'):
        script = Path(__file__).with_name('prepare.sh').read_text()
        old_expressions = 'nwr/amenity=toilets nwr/amenity=fuel nwr/toilets=yes nwr/place r/boundary=postal_code nwr/vending nwr/shop=tobacco,lottery,kiosk,convenience,supermarket,newsagent nwr/lottery=yes nwr/tobacco nwr/sells:tobacco'
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data_root = root / 'data'
            data = data_root / 'countries' / country
            data.mkdir(parents=True)
            tools = root / 'bin'
            tools.mkdir()
            source = data / 'source.osm.pbf'
            source.write_bytes(b'verified retained snapshot')
            checksum = hashlib.md5(source.read_bytes()).hexdigest()
            source_url = f'https://example.invalid/{country}-261025.osm.pbf'
            (data / 'source.url').write_text(source_url)
            (data / 'source.md5').write_text(checksum)
            (data / 'coverage.poly').write_text('coverage')
            (data / 'filtered.osm.pbf').write_bytes(b'old two-category filter')
            (data / 'filtered.source').write_text(source_url + '|' + old_expressions + '\n')
            log = root / 'calls.jsonl'
            driver = root / 'driver.py'
            driver.write_text('''import hashlib, json, os, sys
from pathlib import Path
name = Path(sys.argv[1]).name
args = sys.argv[2:]
with open(os.environ['PREPARE_TEST_LOG'], 'a') as out:
    out.write(json.dumps([name, args]) + '\\n')
if name == 'curl':
    Path(args[args.index('--output') + 1]).write_text(os.environ['PREPARE_TEST_CHECKSUM'] if args[-1].endswith('.md5') else 'coverage')
elif name == 'md5sum':
    print(hashlib.md5(Path(args[0]).read_bytes()).hexdigest() + '  ' + args[0])
elif name == 'python3':
    print(args[1] if args[0].endswith('source.py') else '{"kind":"complete","records":0}')
elif name == 'osmium':
    Path(args[args.index('-o') + 1]).write_bytes(b'new filtered snapshot')
''')
            import sys
            for name in ('curl', 'md5sum', 'python3', 'osmium'):
                executable = tools / name
                executable.write_text(f'#!/bin/sh\nexec "{sys.executable}" "{driver}" "$0" "$@"\n')
                executable.chmod(0o755)
            prepared_script = root / 'prepare.sh'
            prepared_script.write_text(script.replace('/data', str(data_root)))
            environment = {**os.environ, 'PATH': str(tools) + os.pathsep + os.environ['PATH'],
                           'DATA_URL': source_url, 'COUNTRY_CODE':country,'USE_RETAINED_SOURCE':'1' if retained else '0', 'POLY_URL':'https://wrong.invalid/germany.poly', 'PREPARE_TEST_LOG': str(log),
                           'PREPARE_TEST_CHECKSUM': checksum}
            result = subprocess.run(['sh', str(prepared_script)], env=environment,
                                    text=True, capture_output=True, check=True)
            calls = [json.loads(line) for line in log.read_text().splitlines()]
            filters = [args for name, args in calls if name == 'osmium']
            self.assertEqual(len(filters), 1, result.stdout)
            self.assertIn('nwr/cuisine', filters[0])
            self.assertIn('nwr/amenity=atm', filters[0])
            self.assertIn('nwr/tourism=hotel,motel,guest_house,hostel,apartment,chalet,camp_site,caravan_site',filters[0])
            if retained:
                self.assertFalse(any(name=='curl' for name,args in calls))
                extract_calls=[args for name,args in calls if name=='python3' and args[0].endswith('extract.py')]
                self.assertEqual(len(extract_calls),2)
                for args in extract_calls:
                    self.assertEqual(args[args.index('--boundary-source')+1],'https://download.geofabrik.de/europe/romania.poly')
            self.assertTrue(all(expression in filters[0] for expression in old_expressions.split()))
            self.assertFalse(any(name == 'curl' and args[-1] == source_url for name, args in calls))
            self.assertEqual(source.read_bytes(), b'verified retained snapshot')
            self.assertTrue((data / 'extracted.jsonl').is_file())
            self.assertFalse((data / 'extracted.jsonl.part').exists())
            self.assertFalse((data / 'filtered.osm.pbf').exists())
            self.assertFalse((data / 'filtered.source').exists())


if __name__ == '__main__':
    unittest.main()
