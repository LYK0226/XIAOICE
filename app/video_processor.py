"""
Video processing module for analyzing uploaded videos and YouTube links.
Extracts frames at intervals and provides video analysis capabilities.
"""

import os
import cv2
import yt_dlp
import base64
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class VideoProcessor:
    """Handles video processing, frame extraction, and YouTube downloads."""
    
    def __init__(self, upload_folder: str):
        """
        Initialize the video processor.
        
        Args:
            upload_folder: Path to the folder where videos will be stored
        """
        self.upload_folder = upload_folder
        self.frames_folder = os.path.join(upload_folder, 'frames')
        os.makedirs(self.frames_folder, exist_ok=True)
        
    def download_youtube_video(self, url: str) -> Tuple[str, Dict]:
        """
        Download a video from YouTube.
        
        Args:
            url: YouTube video URL
            
        Returns:
            Tuple of (video_path, video_info)
        """
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        output_template = os.path.join(self.upload_folder, f'youtube_{timestamp}.%(ext)s')
        
        ydl_opts = {
            'format': 'best[ext=mp4]/best',  # Prefer mp4 format
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
            'max_filesize': 500 * 1024 * 1024,  # 500MB max
            'nocheckcertificate': True,
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                video_path = ydl.prepare_filename(info)
                
                video_info = {
                    'title': info.get('title', 'Unknown'),
                    'duration': info.get('duration', 0),
                    'description': info.get('description', ''),
                    'uploader': info.get('uploader', 'Unknown'),
                    'upload_date': info.get('upload_date', ''),
                }
                
                logger.info(f"Downloaded YouTube video: {video_info['title']}")
                return video_path, video_info
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error downloading YouTube video: {e}")
            
            # Provide user-friendly error messages
            if 'Sign in to confirm' in error_msg or 'bot' in error_msg.lower():
                raise Exception(
                    "YouTube 檢測到機器人活動，暫時無法下載。\n\n"
                    "建議解決方案：\n"
                    "1. 使用本地影片上傳功能（直接上傳 MP4 文件）\n"
                    "2. 下載 YouTube 影片到本地後再上傳\n"
                    "3. 聯繫管理員配置 YouTube cookies 認證"
                )
            elif 'Video unavailable' in error_msg or 'Private video' in error_msg:
                raise Exception("影片不可用或為私人影片，無法下載")
            elif 'age-restricted' in error_msg.lower():
                raise Exception("影片有年齡限制，需要登入才能下載")
            else:
                raise Exception(f"下載失敗: {error_msg}")
    
    def extract_frames(self, video_path: str, interval_seconds: int = 5, max_frames: int = 20) -> List[Dict]:
        """
        Extract frames from video at regular intervals.
        
        Args:
            video_path: Path to the video file
            interval_seconds: Extract a frame every N seconds
            max_frames: Maximum number of frames to extract
            
        Returns:
            List of dictionaries containing frame data and metadata
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"影片文件不存在: {video_path}")
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise Exception(f"無法打開影片文件: {video_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        
        frames_data = []
        frame_interval = int(fps * interval_seconds)
        frame_count = 0
        extracted_count = 0
        
        logger.info(f"Extracting frames from video: FPS={fps}, Duration={duration}s, Total frames={total_frames}")
        
        while extracted_count < max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_count % frame_interval == 0:
                timestamp = frame_count / fps
                
                # Encode frame to base64 for easy transmission
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                frame_base64 = base64.b64encode(buffer).decode('utf-8')
                
                frames_data.append({
                    'timestamp': round(timestamp, 2),
                    'frame_number': frame_count,
                    'data': frame_base64,
                    'mime_type': 'image/jpeg'
                })
                
                extracted_count += 1
                logger.debug(f"Extracted frame {extracted_count} at {timestamp:.2f}s")
            
            frame_count += 1
        
        cap.release()
        
        logger.info(f"Extracted {len(frames_data)} frames from video")
        return frames_data
    
    def get_video_info(self, video_path: str) -> Dict:
        """
        Get basic information about a video file.
        
        Args:
            video_path: Path to the video file
            
        Returns:
            Dictionary containing video metadata
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise Exception(f"無法打開影片文件: {video_path}")
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        duration = total_frames / fps if fps > 0 else 0
        
        cap.release()
        
        file_size = os.path.getsize(video_path)
        
        return {
            'filename': os.path.basename(video_path),
            'duration': round(duration, 2),
            'fps': round(fps, 2),
            'total_frames': total_frames,
            'width': width,
            'height': height,
            'size_mb': round(file_size / (1024 * 1024), 2),
            'path': video_path
        }
    
    def format_timestamp(self, seconds: float) -> str:
        """
        Format seconds into MM:SS or HH:MM:SS format.
        
        Args:
            seconds: Time in seconds
            
        Returns:
            Formatted time string
        """
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        else:
            return f"{minutes:02d}:{secs:02d}"
    
    def cleanup_video(self, video_path: str):
        """
        Delete a video file and its associated frames.
        
        Args:
            video_path: Path to the video file to delete
        """
        try:
            if os.path.exists(video_path):
                os.remove(video_path)
                logger.info(f"Deleted video: {video_path}")
        except Exception as e:
            logger.error(f"Error deleting video {video_path}: {e}")


def is_youtube_url(url: str) -> bool:
    """
    Check if a URL is a YouTube video link.
    
    Args:
        url: URL to check
        
    Returns:
        True if it's a YouTube URL, False otherwise
    """
    youtube_patterns = [
        'youtube.com/watch',
        'youtu.be/',
        'youtube.com/embed/',
        'youtube.com/v/',
    ]
    return any(pattern in url.lower() for pattern in youtube_patterns)
