#!/usr/bin/env python3
import os
import sys
import json
import pandas as pd
import numpy as np
from pydub import AudioSegment
from pydub.generators import Sine
import datetime
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Config:
    TOTAL_DURATION_SECONDS = 30
    DEFAULT_VOLUME = -10  # dB
    MIN_FREQUENCY_HZ = 18000
    MAX_FREQUENCY_HZ = 22000
    SAMPLE_RATE = 44100  # Hz
    BIT_RATE = "192k"    # Quality
    REQUIRED_EXCEL_COLUMN = "THz"

class NeuroAudioGenerator:
    def __init__(self):
        self.audio_segment = AudioSegment.silent(
            duration=Config.TOTAL_DURATION_SECONDS * 1000,
            frame_rate=Config.SAMPLE_RATE
        )

    @staticmethod
    def thz_to_hz(thz: float) -> float:
        """Convert Terahertz to Hertz with validation."""
        if not isinstance(thz, (int, float)) or np.isnan(thz):
            raise ValueError(f"Invalid frequency value: {thz}")
        return thz * 1e12

    def generate_tone(self, frequency_hz: float, duration_ms: int) -> AudioSegment:
        """Generate a sine tone at specified frequency."""
        try:
            # Clamp frequency to audible range for processing
            freq = min(max(frequency_hz, Config.MIN_FREQUENCY_HZ), Config.MAX_FREQUENCY_HZ)
            tone = Sine(freq, sample_rate=Config.SAMPLE_RATE).to_audio_segment(
                duration=duration_ms,
                volume=Config.DEFAULT_VOLUME
            )
            return tone
        except Exception as e:
            logger.error(f"Error generating tone at {frequency_hz}Hz: {e}")
            raise

    @staticmethod
    def load_frequencies(excel_path: str) -> np.ndarray:
        """Load frequencies from THz column."""
        try:
            logger.info(f"Loading frequencies from: {excel_path}")
            
            if not os.path.exists(excel_path):
                raise FileNotFoundError(f"File not found: {excel_path}")

            # Try reading with openpyxl first, then xlrd
            engines = ['openpyxl', 'xlrd']
            last_error = None
            
            for engine in engines:
                try:
                    df = pd.read_excel(excel_path, engine=engine)
                    
                    if Config.REQUIRED_EXCEL_COLUMN not in df.columns:
                        available_cols = ", ".join(df.columns)
                        raise ValueError(
                            f"Column '{Config.REQUIRED_EXCEL_COLUMN}' not found. "
                            f"Available columns: {available_cols}"
                        )
                    
                    freqs = df[Config.REQUIRED_EXCEL_COLUMN].dropna().values
                    
                    if len(freqs) == 0:
                        raise ValueError("No frequencies found in THz column")
                    
                    logger.info(f"Successfully loaded {len(freqs)} frequencies")
                    return freqs
                    
                except Exception as e:
                    last_error = e
                    continue
            
            raise ValueError(f"Could not read Excel file. Last error: {str(last_error)}")
            
        except Exception as e:
            logger.error(f"Error loading frequencies: {e}")
            raise

    def add_frequencies(self, frequencies_thz: list) -> None:
        """Add multiple frequencies to audio mix."""
        total = len(frequencies_thz)
        logger.info(f"Processing {total} frequencies...")
        
        for i, thz in enumerate(frequencies_thz, 1):
            try:
                hz = self.thz_to_hz(thz)
                tone = self.generate_tone(hz, Config.TOTAL_DURATION_SECONDS * 1000)
                self.audio_segment = self.audio_segment.overlay(tone)
                
                if i % 100 == 0 or i == total:
                    logger.info(f"Progress: {i}/{total} frequencies processed")
                    
            except Exception as e:
                logger.warning(f"Error processing frequency {thz}THz (skipped): {e}")
                continue

    def save_audio(self, output_path: str) -> None:
        """Save audio file as MP3."""
        try:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            if len(self.audio_segment) == 0:
                raise ValueError("No audio data to export")
            
            logger.info(f"Exporting audio to: {output_path}")
            
            self.audio_segment.export(
                output_path,
                format="mp3",
                bitrate=Config.BIT_RATE,
                tags={
                    'title': 'NeuroAudio',
                    'artist': 'NeuroAudio System',
                    'comment': 'Generated automatically'
                }
            )
            
            if not os.path.exists(output_path):
                raise RuntimeError(f"Audio file was not created: {output_path}")
                
            logger.info(f"Audio saved successfully: {os.path.getsize(output_path)} bytes")
            
        except Exception as e:
            logger.error(f"Failed to save audio: {e}")
            raise

def main():
    if len(sys.argv) != 4:
        logger.error("Usage: python audio_processor.py <excel_path> <original_name> <job_id>")
        sys.exit(1)

    excel_path = sys.argv[1]
    original_name = sys.argv[2]
    job_id = sys.argv[3]

    try:
        # Extract company name from filename
        company_match = original_name.split('_')
        company_name = company_match[-1].split('.')[0] if len(company_match) > 2 else 'Unknown'
        
        # Generate unique ID
        aroma_id = uuid.uuid4().hex[:10].upper()
        
        # Create output directory
        output_dir = os.path.join('output', company_name)
        os.makedirs(output_dir, exist_ok=True)
        
        # Initialize generator
        generator = NeuroAudioGenerator()
        
        # Load frequencies
        frequencies = generator.load_frequencies(excel_path)
        
        # Convert to list for JSON serialization
        freq_list = frequencies.tolist()
        
        # Process frequencies
        generator.add_frequencies(freq_list)
        
        # Generate output filenames
        audio_filename = f"NeuroAudio_{company_name}_{aroma_id}.mp3"
        pdf_filename = f"Report_{company_name}_{aroma_id}.pdf"
        
        audio_path = os.path.join(output_dir, audio_filename)
        pdf_path = os.path.join(output_dir, pdf_filename)
        
        # Save audio
        generator.save_audio(audio_path)
        
        # Generate PDF report
        from pdf_generator import generate_pdf_report
        generate_pdf_report(freq_list, pdf_filename, aroma_id, company_name, output_dir)
        
        # Output results as JSON
        result = {
            'frequency_count': len(frequencies),
            'audio_file': audio_filename,
            'pdf_file': pdf_filename,
            'frequency_min': float(np.min(frequencies)),
            'frequency_max': float(np.max(frequencies)),
            'aroma_id': aroma_id,
            'company_name': company_name
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        error_result = {
            'error': str(e),
            'status': 'failed'
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()
