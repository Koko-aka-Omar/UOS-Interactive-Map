"""Package only the seven supplied Student Forums JPEGs; never modify sources."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import struct
from PIL import Image

FILES = [
    'IMG_20260926_180711_00_071.jpg', 'IMG_20260926_180820_00_072.jpg',
    'IMG_20260926_180908_00_073.jpg', 'IMG_20260926_180958_00_074.jpg',
    'IMG_20260926_181203_00_075.jpg', 'IMG_20260926_181301_00_076.jpg',
    'IMG_20260926_181403_00_077.jpg',
]

def glb(jpeg):
    # Same texture-carrying GLB layout as the existing hall packagers.
    positions = struct.pack('<9f', -1, -1, 0, 1, -1, 0, 0, 1, 0)
    uvs = struct.pack('<6f', 0, 0, 1, 0, .5, 1)
    indices = struct.pack('<4H', 0, 1, 2, 0)
    offset = len(positions + uvs + indices)
    binary = positions + uvs + indices + jpeg
    binary += b'\0' * (-len(binary) % 4)
    data = {
        'asset': {'version': '2.0', 'generator': 'HallV3 Student Forums panorama packager'},
        'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0}],
        'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'TEXCOORD_0': 1}, 'indices': 2, 'material': 0}]}],
        'materials': [{'doubleSided': True, 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 1}}],
        'textures': [{'source': 0}], 'images': [{'bufferView': 3, 'mimeType': 'image/jpeg'}],
        'buffers': [{'byteLength': len(binary)}],
        'bufferViews': [{'buffer': 0, 'byteOffset': 0, 'byteLength': 36, 'target': 34962},
                        {'buffer': 0, 'byteOffset': 36, 'byteLength': 24, 'target': 34962},
                        {'buffer': 0, 'byteOffset': 60, 'byteLength': 6, 'target': 34963},
                        {'buffer': 0, 'byteOffset': offset, 'byteLength': len(jpeg)}],
        'accessors': [{'bufferView': 0, 'componentType': 5126, 'count': 3, 'type': 'VEC3', 'min': [-1, -1, 0], 'max': [1, 1, 0]},
                      {'bufferView': 1, 'componentType': 5126, 'count': 3, 'type': 'VEC2', 'min': [0, 0], 'max': [1, 1]},
                      {'bufferView': 2, 'componentType': 5123, 'count': 3, 'type': 'SCALAR', 'min': [0], 'max': [2]}],
    }
    encoded = json.dumps(data, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    return (struct.pack('<5I', 0x46546c67, 2, 28 + len(encoded) + len(binary), len(encoded), 0x4e4f534a)
            + encoded + struct.pack('<2I', len(binary), 0x004e4942) + binary)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    args = parser.parse_args()
    app = Path(__file__).resolve().parents[1] / 'M7A_GitHub_Website_Full_Resolution/m7a-building'
    for directory in ['assets', 'assets-mobile', 'panoramas-mobile']:
        (app / directory).mkdir(exist_ok=True)
    for number, name in enumerate(FILES, 71):
        source = args.source / name
        original = source.read_bytes()
        with Image.open(io.BytesIO(original)) as image:
            if image.size != (11904, 5952) or image.mode != 'RGB' or image.getexif().get(274, 1) != 1:
                raise ValueError('Unexpected projection/orientation: ' + name)
            # Established project mobile size, not a change to desktop/source quality.
            mobile = image.resize((3072, 1536), Image.Resampling.LANCZOS)
            stream = io.BytesIO()
            mobile.save(stream, format='JPEG', quality=90, optimize=True)
        stem = f'student-forums-{number:03}'
        targets = [(app / 'assets' / (stem + '.glb'), glb(original)),
                   (app / 'assets-mobile' / (stem + '.glb'), glb(stream.getvalue())),
                   (app / 'panoramas-mobile' / (stem + '.jpg'), stream.getvalue())]
        for target, data in targets:
            if target.exists():
                if target.read_bytes() != data:
                    raise FileExistsError('Refusing to overwrite different asset: ' + str(target))
            else:
                target.write_bytes(data)
        print(stem, 'original SHA256', hashlib.sha256(original).hexdigest())

if __name__ == '__main__':
    main()
