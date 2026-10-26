"""Resolve immutable Geofabrik snapshots with published checksums."""
import html as html_module
import re
import sys
import urllib.request
from urllib.parse import urlparse, urljoin


def snapshot_from_page(source_url, html):
    parsed = urlparse(source_url)
    if parsed.scheme != 'https' or parsed.netloc != 'download.geofabrik.de' or parsed.query or parsed.fragment:
        raise ValueError('Expected a Geofabrik HTTPS source URL')
    if not parsed.path.endswith('-latest.osm.pbf'):
        if not re.search(r'-\d{6}\.osm\.pbf$', parsed.path):
            raise ValueError('Expected latest or dated PBF source')
        return source_url
    prefix = parsed.path.rsplit('/', 1)[-1].removesuffix('-latest.osm.pbf')
    candidates = []
    for href in re.findall(r'href=[\"\']([^\"\']+)[\"\']', html):
        candidate = urljoin(source_url, html_module.unescape(href))
        target = urlparse(candidate)
        if target.netloc == parsed.netloc and target.path.rsplit('/', 1)[0] == parsed.path.rsplit('/', 1)[0] and re.fullmatch(re.escape(prefix) + r'-\d{6}\.osm\.pbf\.md5', target.path.rsplit('/', 1)[-1]):
            candidates.append(candidate.removesuffix('.md5'))
    if not candidates:
        raise ValueError('No dated source with a published checksum')
    return max(candidates)


if __name__ == '__main__':
    source = sys.argv[1]
    page = ''
    if source.endswith('-latest.osm.pbf'):
        request = urllib.request.Request(source.removesuffix('-latest.osm.pbf') + '.html', headers={'User-Agent': 'Find-a-Loo importer (https://github.com/orailean/find-a-loo)'})
        with urllib.request.urlopen(request, timeout=60) as response:
            page = response.read().decode('utf-8')
    print(snapshot_from_page(source, page))
