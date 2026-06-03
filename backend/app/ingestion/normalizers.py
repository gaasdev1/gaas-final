import re
from typing import Any


def clean_html(text: str | None) -> str:
    return re.sub("<[^<]+?>", "", text or "").strip()


def tmdb_item(item: dict[str, Any], media_type: str, image_base: str) -> dict[str, Any]:
    title = item.get("title") or item.get("name") or "Untitled"
    return {
        "content_type": media_type,
        "title": title,
        "original_title": item.get("original_title") or item.get("original_name") or title,
        "description": item.get("overview") or "",
        "genres": [],
        "tags": [],
        "moods": [],
        "image_url": f"{image_base}{item['poster_path']}" if item.get("poster_path") else None,
        "banner_url": f"{image_base}{item['backdrop_path']}" if item.get("backdrop_path") else None,
        "release_year": int((item.get("release_date") or item.get("first_air_date") or "0")[:4] or 0) or None,
        "rating": float(item.get("vote_average") or 0),
        "popularity": float(item.get("popularity") or 0),
        "source": "tmdb",
        "external_id": str(item["id"]),
        "external_url": f"https://www.themoviedb.org/{media_type}/{item['id']}",
        "language": item.get("original_language"),
    }


def anilist_item(item: dict[str, Any], content_type: str) -> dict[str, Any]:
    title = item.get("title", {}).get("english") or item.get("title", {}).get("romaji") or "Untitled"
    return {
        "content_type": content_type,
        "title": title,
        "original_title": item.get("title", {}).get("native") or title,
        "description": clean_html(item.get("description")),
        "genres": item.get("genres") or [],
        "tags": [],
        "moods": [],
        "image_url": (item.get("coverImage") or {}).get("extraLarge"),
        "banner_url": item.get("bannerImage"),
        "release_year": None,
        "rating": float(item.get("averageScore") or 0) / 10,
        "popularity": float(item.get("popularity") or 0),
        "source": "anilist",
        "external_id": str(item["id"]),
        "external_url": f"https://anilist.co/anime/{item['id']}",
        "language": None,
    }


def rawg_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "content_type": "game",
        "title": item.get("name") or "Untitled",
        "original_title": item.get("name") or "Untitled",
        "description": "A highly rated game surfaced from RAWG trending data.",
        "genres": [genre.get("name", "").lower() for genre in item.get("genres", []) if genre.get("name")],
        "tags": [tag.get("name", "").lower() for tag in item.get("tags", [])[:5] if tag.get("name")],
        "moods": [],
        "image_url": item.get("background_image"),
        "banner_url": item.get("background_image"),
        "release_year": int((item.get("released") or "0")[:4] or 0) or None,
        "rating": float(item.get("rating") or 0) * 2,
        "popularity": float(item.get("ratings_count") or item.get("added") or 0),
        "source": "rawg",
        "external_id": str(item["id"]),
        "external_url": f"https://rawg.io/games/{item.get('slug')}" if item.get("slug") else None,
        "language": None,
    }


def google_book_item(item: dict[str, Any]) -> dict[str, Any]:
    info = item.get("volumeInfo", {})
    title = info.get("title") or "Untitled"
    identifiers = info.get("industryIdentifiers") or []
    isbn = next((entry.get("identifier") for entry in identifiers if entry.get("identifier")), item.get("id"))
    return {
        "content_type": "book",
        "title": title,
        "original_title": title,
        "description": clean_html(info.get("description")),
        "genres": [category.lower() for category in info.get("categories", [])],
        "tags": [author.lower() for author in info.get("authors", [])[:3]],
        "moods": [],
        "image_url": (info.get("imageLinks") or {}).get("thumbnail"),
        "banner_url": (info.get("imageLinks") or {}).get("thumbnail"),
        "release_year": int((info.get("publishedDate") or "0")[:4] or 0) or None,
        "rating": float(info.get("averageRating") or 0) * 2,
        "popularity": float(info.get("ratingsCount") or 0),
        "source": "google_books",
        "external_id": str(isbn),
        "external_url": info.get("infoLink"),
        "language": info.get("language"),
    }


def open_library_item(item: dict[str, Any]) -> dict[str, Any]:
    title = item.get("title") or "Untitled"
    cover_id = item.get("cover_i")
    return {
        "content_type": "book",
        "title": title,
        "original_title": title,
        "description": "A book recommendation from Open Library discovery data.",
        "genres": [subject.lower() for subject in item.get("subject", [])[:4]],
        "tags": [author.lower() for author in item.get("author_name", [])[:3]],
        "moods": [],
        "image_url": f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else None,
        "banner_url": f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else None,
        "release_year": item.get("first_publish_year"),
        "rating": 0,
        "popularity": float(item.get("edition_count") or 0),
        "source": "open_library",
        "external_id": item.get("key", title),
        "external_url": f"https://openlibrary.org{item.get('key')}" if item.get("key") else None,
        "language": (item.get("language") or [None])[0],
    }


def spotify_podcast_item(item: dict[str, Any]) -> dict[str, Any]:
    title = item.get("name") or "Untitled Podcast"
    images = item.get("images") or []
    image = images[0].get("url") if images else None
    publisher = item.get("publisher")
    return {
        "content_type": "podcast",
        "title": title,
        "original_title": title,
        "description": clean_html(item.get("description")),
        "genres": ["podcast"],
        "tags": [publisher.lower()] if publisher else [],
        "moods": [],
        "image_url": image,
        "banner_url": image,
        "release_year": None,
        "rating": 0,
        "popularity": float(item.get("total_episodes") or 0),
        "source": "spotify",
        "external_id": str(item.get("id") or title),
        "external_url": (item.get("external_urls") or {}).get("spotify"),
        "language": (item.get("languages") or [None])[0],
    }


def embedding_text(item: dict[str, Any]) -> str:
    bits = [
        item.get("title") or "",
        item.get("description") or "",
        "Genres: " + ", ".join(item.get("genres") or []),
        "Tags: " + ", ".join(item.get("tags") or []),
        "Moods: " + ", ".join(item.get("moods") or []),
        f"Source: {item.get('source')}",
    ]
    return ". ".join([b for b in bits if b])
