#!/usr/bin/env python3
"""
Management Narasi Cerita (Story Management CLI Suite)
Digunakan oleh Admin untuk mengelola alur babak cerita (Ramayana Arcade Story Mode):
1. Melihat alur cerita dan integritas aset
2. Membuat alur cerita baru (semua babak)
3. Mengedit babak tertentu secara modular tanpa menghapus babak lain
4. Menambahkan babak baru di akhir alur
5. Menghapus babak tertentu
6. Validasi file video & karakter rig di disk
Menyimpan konfigurasi ke: src/data/story-config.json
"""

import os
import sys
import json
import shutil
from pathlib import Path
from typing import List, Dict, Any, Optional

# Pastikan output utf-8 aman di Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stdin.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent
CHAR_DIR = ROOT_DIR / "src" / "assets" / "characters"
VIDEO_DIR = ROOT_DIR / "public" / "videos"
CONFIG_FILE = ROOT_DIR / "src" / "data" / "story-config.json"
BACKUP_FILE = ROOT_DIR / "src" / "data" / "story-config.json.bak"


# ==============================================================================
# DETEKSI ASET (KARAKTER & VIDEO)
# ==============================================================================

def get_ready_characters() -> List[str]:
    """
    Mendeteksi karakter yang benar-benar siap dimainkan di game:
    Harus berupa folder yang memiliki file 'rig.json' yang valid.
    Mencegah crash runtime dari file png mentah yang belum di-rig.
    """
    ready = []
    if not CHAR_DIR.exists():
        return ready

    for item in sorted(CHAR_DIR.iterdir()):
        if item.is_dir():
            rig_file = item / "rig.json"
            if rig_file.exists():
                ready.append(item.name)
    return ready


def get_unrigged_characters() -> List[str]:
    """Mendeteksi gambar mentah yang belum memiliki folder rig."""
    unrigged = []
    if not CHAR_DIR.exists():
        return unrigged

    ready_set = set(get_ready_characters())
    for item in sorted(CHAR_DIR.iterdir()):
        if item.is_file() and item.suffix.lower() == ".png":
            name = item.stem
            if name not in ready_set:
                unrigged.append(name)
    return unrigged


def get_available_videos() -> List[str]:
    """Mendeteksi file video di folder public/videos/."""
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    videos = []
    for ext in ("*.mp4", "*.webm", "*.mov"):
        videos.extend([f.name for f in VIDEO_DIR.glob(ext)])
    return sorted(set(videos))


def normalize_video_path(video_input: str) -> str:
    """
    Membersihkan input nama file video agar selalu berformat '/videos/<filename>'.
    Menghilangkan duplikasi prefix '/videos/videos/'.
    """
    cleaned = video_input.strip().replace("\\", "/")
    base_name = os.path.basename(cleaned)
    return f"/videos/{base_name}"


def check_video_exists_on_disk(video_path: str) -> bool:
    """Mengecek apakah file video fisik benar-benar ada di public/videos/."""
    base_name = os.path.basename(video_path)
    file_path = VIDEO_DIR / base_name
    return file_path.exists() and file_path.is_file()


# ==============================================================================
# MANAJEMEN KONFIGURASI (LOAD, SAVE, BACKUP)
# ==============================================================================

def load_config() -> Dict[str, Any]:
    """Membaca konfigurasi cerita dari story-config.json."""
    if not CONFIG_FILE.exists():
        return {"totalChapters": 0, "chapters": []}
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if "chapters" not in data:
                data["chapters"] = []
            data["totalChapters"] = len(data["chapters"])
            return data
    except Exception as e:
        print(f"[!] Peringatan: Gagal membaca {CONFIG_FILE.name}: {e}")
        return {"totalChapters": 0, "chapters": []}


def save_config(config: Dict[str, Any]) -> bool:
    """Menyimpan konfigurasi cerita ke story-config.json dengan backup otomatis."""
    try:
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        # Re-index chapter indices agar berurutan 1..N
        for idx, ch in enumerate(config.get("chapters", []), 1):
            ch["chapterIndex"] = idx
        config["totalChapters"] = len(config.get("chapters", []))

        # Buat backup file sebelumnya jika ada
        if CONFIG_FILE.exists():
            shutil.copy2(CONFIG_FILE, BACKUP_FILE)

        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
            f.write("\n")
        return True
    except Exception as e:
        print(f"[!] Error saat menyimpan file: {e}")
        return False


# ==============================================================================
# INPUT HELPERS
# ==============================================================================

def prompt_text(label: str, default: str = "") -> str:
    """Input teks terminal dengan nilai default."""
    if default:
        res = input(f"{label} [default: {default}]: ").strip()
        return res if res else default
    while True:
        try:
            res = input(f"{label}: ").strip()
            if res:
                return res
            print("  [!] Nilai tidak boleh kosong.")
        except (KeyboardInterrupt, EOFError):
            print("\nOperasi dibatalkan.")
            sys.exit(0)


def choose_from_list(prompt_text_label: str, items: List[str], allow_custom: bool = False, current_value: str = "") -> str:
    """Menampilkan daftar bernomor dan mengembalikan item yang dipilih."""
    print(f"\n{prompt_text_label}")
    if current_value:
        print(f"  [Nilai Saat Ini: {current_value}]")
    for idx, item in enumerate(items, 1):
        marker = " (aktif)" if item == current_value else ""
        print(f"  [{idx}] {item}{marker}")
    if allow_custom:
        print("  [0] Ketik nama file sendiri secara manual")

    while True:
        try:
            choice = input("Pilih nomor: ").strip()
            if not choice and current_value:
                return current_value
            if allow_custom and choice == "0":
                custom = input("Masukkan nama file video (contoh: intro_babak_1.mp4): ").strip()
                if custom:
                    norm = normalize_video_path(custom)
                    if not check_video_exists_on_disk(norm):
                        print(f"  [PERINGATAN] File '{os.path.basename(norm)}' saat ini BELUM ADA di public/videos/.")
                        print("  Pastikan file tersebut disalin ke folder sebelum dimainkan.")
                    return os.path.basename(norm)
            num = int(choice)
            if 1 <= num <= len(items):
                return items[num - 1]
            print(f"  [!] Pilihan tidak valid. Masukkan angka 1 sampai {len(items)}.")
        except ValueError:
            print("  [!] Harap masukkan angka yang valid.")
        except (KeyboardInterrupt, EOFError):
            print("\nOperasi dibatalkan.")
            sys.exit(0)


# ==============================================================================
# ALUR PENGATURAN BABAK (CHAPTER FORM)
# ==============================================================================

def configure_chapter(chapter_num: int, existing_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Form interaktif untuk mengisi atau memperbarui data satu babak cerita."""
    ready_chars = get_ready_characters()
    videos = get_available_videos()
    old = existing_data or {}

    print(f"\n" + "=" * 58)
    if existing_data:
        print(f"  [EDIT BABAK {chapter_num}: {old.get('title', '')}]")
    else:
        print(f"  [PENGISIAN BABAK BARU: BABAK {chapter_num}]")
    print("=" * 58)

    # 1. Judul & Subtitle
    title = prompt_text(f">> Judul Babak {chapter_num}", old.get("title", f"Babak {chapter_num}"))
    subtitle = prompt_text(f">> Sub-judul / Latar Cerita Babak {chapter_num}", old.get("subtitle", "Pertarungan di Kelir"))

    # 2. Karakter Player 1 & CPU
    curr_p1 = old.get("player1", ready_chars[0] if ready_chars else "hanoman")
    p1 = choose_from_list(
        f">> Pilih Karakter Player 1 (Sebelah KIRI) untuk Babak {chapter_num}:",
        ready_chars,
        current_value=curr_p1
    )

    curr_cpu = old.get("cpu", ready_chars[1] if len(ready_chars) > 1 else ready_chars[0])
    cpu = choose_from_list(
        f">> Pilih Karakter CPU (Sebelah KANAN) untuk Babak {chapter_num}:",
        ready_chars,
        current_value=curr_cpu
    )

    if p1 == cpu:
        print("  [INFO] Pertarungan Cermin (Mirror Match) terdeteksi.")
        print(f"  Karakter CPU '{cpu}' akan otomatis menggunakan kostum/tint alternatif di dalam game.")

    # 3. File Video Sinematik
    print("\n-- [PILIHAN FILE VIDEO SINEMATIK] --")
    default_intro = os.path.basename(old.get("introVideo", f"intro_babak_{chapter_num}.mp4"))
    if videos:
        intro_file = choose_from_list(
            f">> Pilih File Film INTRO Babak {chapter_num}:",
            videos,
            allow_custom=True,
            current_value=default_intro
        )
    else:
        intro_file = prompt_text("Nama File Film INTRO (di folder public/videos/)", default_intro)

    default_outro = os.path.basename(old.get("outroVideo", f"outro_babak_{chapter_num}.mp4"))
    if videos:
        outro_file = choose_from_list(
            f">> Pilih File Film OUTRO / Episode Berikutnya Babak {chapter_num}:",
            videos,
            allow_custom=True,
            current_value=default_outro
        )
    else:
        outro_file = prompt_text("Nama File Film OUTRO (di folder public/videos/)", default_outro)

    # 4. Rage Combat Videos (Dukungan fleksibel: 1 atau lebih video)
    existing_rage = old.get("rageVideos", [
        f"/videos/combo_1_sugriwa_ke_subali.mp4",
        f"/videos/combo_2_sugriwa_ke_subali.mp4"
    ])
    
    rage_list = []
    print(f"\n>> Pengaturan Video Rage Combat (Amuk Wayang saat darah <= 50%):")
    if existing_rage:
        print(f"  Video saat ini ({len(existing_rage)} file): {', '.join([os.path.basename(x) for x in existing_rage])}")
    
    use_existing = False
    if existing_data and existing_rage:
        ans = input("  Gunakan daftar video rage yang sudah ada? (Y/n): ").strip().lower()
        if ans != "n":
            use_existing = True
            rage_list = existing_rage

    if not use_existing:
        while True:
            try:
                count_str = input("  Berapa jumlah file video rage combat untuk babak ini? [1-3, default: 2]: ").strip()
                rage_count = int(count_str) if count_str else 2
                if 1 <= rage_count <= 5:
                    break
                print("  [!] Masukkan jumlah antara 1 sampai 5.")
            except ValueError:
                print("  [!] Harap masukkan angka valid.")

        for r_idx in range(1, rage_count + 1):
            def_rage = os.path.basename(existing_rage[r_idx - 1]) if r_idx - 1 < len(existing_rage) else (videos[0] if videos else f"rage_{r_idx}.mp4")
            if videos:
                chosen_rage = choose_from_list(
                    f">> Pilih Video Rage Combat {r_idx} dari {rage_count}:",
                    videos,
                    allow_custom=True,
                    current_value=def_rage
                )
            else:
                chosen_rage = prompt_text(f"File Video Rage Combat {r_idx}", def_rage)
            rage_list.append(normalize_video_path(chosen_rage))

    # Bangun objek babak
    chapter_data = {
        "chapterIndex": chapter_num,
        "title": title,
        "subtitle": subtitle,
        "player1": p1,
        "cpu": cpu,
        "introVideo": normalize_video_path(intro_file),
        "outroVideo": normalize_video_path(outro_file),
        "rageVideos": [normalize_video_path(r) for r in rage_list]
    }

    print(f"\n[OK] Rangkuman Babak {chapter_num}:")
    print(f"  • {title} - '{subtitle}'")
    print(f"  • Laga: {p1.upper()} (P1) vs {cpu.upper()} (CPU)")
    print(f"  • Intro: {chapter_data['introVideo']}")
    print(f"  • Outro: {chapter_data['outroVideo']}")
    print(f"  • Rage: {', '.join(chapter_data['rageVideos'])}")
    return chapter_data


# ==============================================================================
# FITUR TAMPILAN & VALIDASI INTEGRITAS
# ==============================================================================

def display_story_overview(config: Dict[str, Any]) -> None:
    """Menampilkan tabel ikhtisar alur cerita yang aktif beserta status asetnya."""
    chapters = config.get("chapters", [])
    ready_chars = set(get_ready_characters())

    print("\n" + "=" * 70)
    print("   📖 IKHTISAR ALUR CERITA (RAMAYANA ARCADE STORY MODE)")
    print("=" * 70)
    if not chapters:
        print("  [INFO] Belum ada babak cerita yang tersimpan.")
        print("=" * 70)
        return

    print(f"Total Babak Pertarungan: {len(chapters)}\n")
    for ch in chapters:
        idx = ch.get("chapterIndex", "?")
        title = ch.get("title", "Tanpa Judul")
        sub = ch.get("subtitle", "")
        p1 = ch.get("player1", "?")
        cpu = ch.get("cpu", "?")
        intro = ch.get("introVideo", "")
        outro = ch.get("outroVideo", "")
        rage = ch.get("rageVideos", [])

        # Cek status file
        p1_stat = "✓" if p1 in ready_chars else "✗ (Rig Belum Ada!)"
        cpu_stat = "✓" if cpu in ready_chars else "✗ (Rig Belum Ada!)"
        intro_stat = "✓" if check_video_exists_on_disk(intro) else "✗ (File Hilang!)"
        outro_stat = "✓" if check_video_exists_on_disk(outro) else "✗ (File Hilang!)"

        print(f"  [BABAK {idx}] {title}")
        if sub:
            print(f"    Sub-judul : {sub}")
        print(f"    Pertarungan: {p1} [{p1_stat}] VS {cpu} [{cpu_stat}]")
        print(f"    Film Intro : {intro} [{intro_stat}]")
        print(f"    Film Outro : {outro} [{outro_stat}]")
        print(f"    Rage Combo :")
        for r_idx, rv in enumerate(rage, 1):
            r_stat = "✓" if check_video_exists_on_disk(rv) else "✗ (File Hilang!)"
            print(f"      - Video {r_idx}: {rv} [{r_stat}]")
        print("  " + "-" * 66)
    print("=" * 70)


def validate_story_integrity(config: Optional[Dict[str, Any]] = None, verbose: bool = True) -> bool:
    """
    Memvalidasi seluruh ketergantungan aset cerita:
    - Memeriksa keberadaan folder karakter rig
    - Memeriksa file fisik video di folder public/videos/
    Mengembalikan True jika semua aset valid, False jika ada yang hilang.
    """
    if config is None:
        config = load_config()

    chapters = config.get("chapters", [])
    ready_chars = set(get_ready_characters())
    unrigged_chars = get_unrigged_characters()
    errors = []
    warnings = []

    if verbose:
        print("\n" + "=" * 70)
        print("   🔍 DIAGNOSTIK & VALIDASI INTEGRITAS ASET CERITA")
        print("=" * 70)

    if not chapters:
        warnings.append("Belum ada babak cerita di story-config.json.")

    # 1. Peringatan karakter yang belum di-rig
    if unrigged_chars:
        warnings.append(
            f"Ditemukan {len(unrigged_chars)} gambar karakter mentah yang belum di-rig: "
            f"{', '.join(unrigged_chars)}. (Jalankan: python scripts/build-rig.py untuk membuatnya)"
        )

    # 2. Validasi per babak
    for ch in chapters:
        idx = ch.get("chapterIndex", "?")
        title = ch.get("title", f"Babak {idx}")

        p1 = ch.get("player1", "")
        if not p1 or p1 not in ready_chars:
            errors.append(f"Babak {idx} ({title}): Karakter Player 1 '{p1}' tidak memiliki rig.json di src/assets/characters/{p1}/")

        cpu = ch.get("cpu", "")
        if not cpu or cpu not in ready_chars:
            errors.append(f"Babak {idx} ({title}): Karakter CPU '{cpu}' tidak memiliki rig.json di src/assets/characters/{cpu}/")

        intro = ch.get("introVideo", "")
        if not intro or not check_video_exists_on_disk(intro):
            warnings.append(f"Babak {idx} ({title}): File Intro '{intro}' tidak ditemukan di public/videos/")

        outro = ch.get("outroVideo", "")
        if not outro or not check_video_exists_on_disk(outro):
            warnings.append(f"Babak {idx} ({title}): File Outro '{outro}' tidak ditemukan di public/videos/")

        for r_idx, rv in enumerate(ch.get("rageVideos", []), 1):
            if not check_video_exists_on_disk(rv):
                warnings.append(f"Babak {idx} ({title}): File Rage Video {r_idx} '{rv}' tidak ditemukan di public/videos/")

    if verbose:
        if not errors and not warnings:
            print("  [SUCCESS] Seluruh karakter dan file video lengkap dan siap tayang 100%! ✓")
        else:
            if errors:
                print(f"\n  [ERROR KRITIS] Ditemukan {len(errors)} masalah (Dapat menyebabkan game crash):")
                for err in errors:
                    print(f"   ✗ {err}")
            if warnings:
                print(f"\n  [PERINGATAN ASET] Ditemukan {len(warnings)} aset video/gambar yang perlu dicek:")
                for w in warnings:
                    print(f"   ! {w}")
        print("=" * 70)

    return len(errors) == 0


# ==============================================================================
# MENU UTAMA INTERAKTIF (CRUD)
# ==============================================================================

def menu_create_all() -> None:
    """Membuat alur cerita baru dari awal (menentukan jumlah babak)."""
    print("\n" + "=" * 58)
    print("   [+] BUAT ALUR CERITA BARU DARI AWAL [+]")
    print("=" * 58)
    while True:
        try:
            count_str = input(">> Masukkan total jumlah scene combat (contoh: 2): ").strip()
            count = int(count_str)
            if count > 0:
                break
            print("  [!] Jumlah babak minimal 1.")
        except ValueError:
            print("  [!] Harap masukkan bilangan bulat.")
        except (KeyboardInterrupt, EOFError):
            print("\nDibatalkan.")
            return

    new_chapters = []
    for i in range(1, count + 1):
        ch_data = configure_chapter(i)
        new_chapters.append(ch_data)

    print("\n" + "-" * 58)
    ans = input(f"Simpan {len(new_chapters)} babak ke story-config.json? (Y/n): ").strip().lower()
    if ans != "n":
        config = {"totalChapters": len(new_chapters), "chapters": new_chapters}
        if save_config(config):
            print(f"[SUKSES] Konfigurasi baru berhasil disimpan ke {CONFIG_FILE.relative_to(ROOT_DIR)}!")
    else:
        print("[INFO] Perubahan dibatalkan, file konfigurasi tidak diubah.")


def menu_edit_chapter() -> None:
    """Mengedit salah satu babak tanpa menghapus babak lainnya."""
    config = load_config()
    chapters = config.get("chapters", [])
    if not chapters:
        print("\n[!] Belum ada babak cerita untuk diedit. Buat babak baru terlebih dahulu.")
        return

    print("\n" + "=" * 58)
    print("   [✎] EDIT BABAK CERITA")
    print("=" * 58)
    for idx, ch in enumerate(chapters, 1):
        print(f"  [{idx}] Babak {idx}: {ch.get('title', '')} ({ch.get('player1', '')} vs {ch.get('cpu', '')})")

    while True:
        try:
            choice = input(f"Pilih nomor babak yang ingin diedit [1-{len(chapters)}, atau 0 untuk batal]: ").strip()
            if choice == "0":
                print("Pengeditan dibatalkan.")
                return
            num = int(choice)
            if 1 <= num <= len(chapters):
                target_idx = num - 1
                break
            print(f"  [!] Masukkan angka antara 1 sampai {len(chapters)}.")
        except ValueError:
            print("  [!] Masukkan angka yang valid.")
        except (KeyboardInterrupt, EOFError):
            print("\nDibatalkan.")
            return

    # Jalankan form dengan data eksisting
    updated = configure_chapter(num, existing_data=chapters[target_idx])
    chapters[target_idx] = updated

    ans = input(f"\nSimpan perubahan pada Babak {num}? (Y/n): ").strip().lower()
    if ans != "n":
        if save_config(config):
            print(f"[SUKSES] Babak {num} berhasil diperbarui!")
    else:
        print("[INFO] Perubahan dibatalkan.")


def menu_append_chapter() -> None:
    """Menambahkan satu babak baru di urutan paling akhir."""
    config = load_config()
    chapters = config.get("chapters", [])
    next_num = len(chapters) + 1

    print("\n" + "=" * 58)
    print(f"   [+] TAMBAH BABAK BARU (BABAK {next_num})")
    print("=" * 58)

    new_ch = configure_chapter(next_num)
    chapters.append(new_ch)

    ans = input(f"\nTambahkan Babak {next_num} ke story-config.json? (Y/n): ").strip().lower()
    if ans != "n":
        if save_config(config):
            print(f"[SUKSES] Babak {next_num} berhasil ditambahkan!")
    else:
        print("[INFO] Penambahan babak dibatalkan.")


def menu_delete_chapter() -> None:
    """Menghapus salah satu babak dari konfigurasi."""
    config = load_config()
    chapters = config.get("chapters", [])
    if not chapters:
        print("\n[!] Belum ada babak cerita untuk dihapus.")
        return

    print("\n" + "=" * 58)
    print("   [-] HAPUS BABAK CERITA")
    print("=" * 58)
    for idx, ch in enumerate(chapters, 1):
        print(f"  [{idx}] Babak {idx}: {ch.get('title', '')} ({ch.get('player1', '')} vs {ch.get('cpu', '')})")

    while True:
        try:
            choice = input(f"Pilih nomor babak yang ingin dihapus [1-{len(chapters)}, atau 0 untuk batal]: ").strip()
            if choice == "0":
                print("Penghapusan dibatalkan.")
                return
            num = int(choice)
            if 1 <= num <= len(chapters):
                target_idx = num - 1
                break
            print(f"  [!] Masukkan angka antara 1 sampai {len(chapters)}.")
        except ValueError:
            print("  [!] Masukkan angka yang valid.")
        except (KeyboardInterrupt, EOFError):
            print("\nDibatalkan.")
            return

    target_title = chapters[target_idx].get("title", f"Babak {num}")
    confirm = input(f"YAKIN ingin menghapus Babak {num} ('{target_title}')? (ketik 'ya' untuk konfirmasi): ").strip().lower()
    if confirm in ("ya", "yes", "y"):
        chapters.pop(target_idx)
        if save_config(config):
            print(f"[SUKSES] Babak {num} berhasil dihapus. Nomor urut babak lainnya telah disesuaikan.")
    else:
        print("[INFO] Penghapusan dibatalkan.")


def main():
    # Dukungan Flag Argumen CLI Non-Interaktif
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg in ("--list", "-l"):
            display_story_overview(load_config())
            sys.exit(0)
        elif arg in ("--validate", "-v"):
            is_valid = validate_story_integrity(verbose=True)
            sys.exit(0 if is_valid else 1)
        elif arg in ("--help", "-h"):
            print("Usage:")
            print("  python scripts/story-manager.py           # Menjalankan menu interaktif")
            print("  python scripts/story-manager.py --list    # Melihat ikhtisar babak cerita")
            print("  python scripts/story-manager.py --validate# Mengecek integritas aset dan file video")
            sys.exit(0)

    # Loop Menu Interaktif
    ready_chars = get_ready_characters()
    if not ready_chars:
        print("[!] Error Fatal: Tidak ada karakter yang memiliki rig.json di src/assets/characters/!")
        print("    Jalankan 'python scripts/build-rig.py' terlebih dahulu untuk mengekstrak rig karakter.")
        sys.exit(1)

    while True:
        print("\n" + "=" * 65)
        print("   🎭 MANAGEMENT NARASI CERITA - RAMAYANA ARCADE STORY 🎭")
        print("=" * 65)
        print(f"  Status: {len(ready_chars)} karakter siap laga | {len(get_available_videos())} video terdeteksi")
        print("  Pilihan Menu:")
        print("    [1] 📖 Lihat Alur Cerita Saat Ini (Overview & Status Aset)")
        print("    [2] ➕ Buat Alur Cerita Baru dari Awal (Reset & Buat Ulang)")
        print("    [3] ✎  Edit Babak Tertentu (Ubah Karakter / Video / Judul)")
        print("    [4] ⏩ Tambah Babak Baru di Akhir Cerita (Append Chapter)")
        print("    [5] 🗑  Hapus Salah Satu Babak")
        print("    [6] 🔍 Diagnostik & Validasi Integritas File Aset")
        print("    [0] 🚪 Keluar")
        print("-" * 65)

        try:
            choice = input("Pilih menu [0-6]: ").strip()
            if choice == "1":
                display_story_overview(load_config())
            elif choice == "2":
                menu_create_all()
            elif choice == "3":
                menu_edit_chapter()
            elif choice == "4":
                menu_append_chapter()
            elif choice == "5":
                menu_delete_chapter()
            elif choice == "6":
                validate_story_integrity(verbose=True)
            elif choice in ("0", "q", "exit"):
                print("\nTerima kasih. Rahayu!")
                sys.exit(0)
            else:
                print("  [!] Pilihan tidak dikenal. Silakan masukkan angka 0 sampai 6.")
        except (KeyboardInterrupt, EOFError):
            print("\nTerima kasih. Program ditutup.")
            sys.exit(0)


if __name__ == "__main__":
    main()
