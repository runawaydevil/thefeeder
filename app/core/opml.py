"""
OPML (Outline Processor Markup Language) import/export functionality.
"""

import xml.etree.ElementTree as ET
from typing import List, Dict, Any
from datetime import datetime


def parse_opml(opml_content: str) -> List[Dict[str, Any]]:
    """
    Parse OPML content and extract feed information.
    
    Args:
        opml_content: OPML XML content as string
    
    Returns:
        List of feed dictionaries with name, url, and optional interval_seconds
    """
    feeds = []
    
    try:
        root = ET.fromstring(opml_content)
        
        # Find all outline elements
        for outline in root.findall('.//outline'):
            # Check if it's a feed (has xmlUrl or url attribute)
            xml_url = outline.get('xmlUrl') or outline.get('url')
            if xml_url:
                feed = {
                    'name': outline.get('title') or outline.get('text') or outline.get('name', 'Unnamed Feed'),
                    'url': xml_url,
                    'interval_seconds': None  # Can be extended later
                }
                feeds.append(feed)
    
    except ET.ParseError as e:
        raise ValueError(f"Invalid OPML format: {e}")
    
    return feeds


def generate_opml(feeds: List[Dict[str, Any]]) -> str:
    """
    Generate OPML content from feeds.
    
    Args:
        feeds: List of feed dictionaries
    
    Returns:
        OPML XML content as string
    """
    root = ET.Element('opml')
    root.set('version', '2.0')
    
    head = ET.SubElement(root, 'head')
    title = ET.SubElement(head, 'title')
    title.text = 'Pablo Feeds Export'
    date_created = ET.SubElement(head, 'dateCreated')
    date_created.text = datetime.utcnow().isoformat()
    
    body = ET.SubElement(root, 'body')
    
    for feed in feeds:
        outline = ET.SubElement(body, 'outline')
        outline.set('type', 'rss')
        outline.set('text', feed.get('name', 'Unnamed Feed'))
        outline.set('title', feed.get('name', 'Unnamed Feed'))
        outline.set('xmlUrl', feed.get('url', ''))
    
    # Convert to string
    tree = ET.ElementTree(root)
    ET.indent(tree, space='  ')
    
    from io import BytesIO
    buffer = BytesIO()
    tree.write(buffer, encoding='utf-8', xml_declaration=True)
    return buffer.getvalue().decode('utf-8')

