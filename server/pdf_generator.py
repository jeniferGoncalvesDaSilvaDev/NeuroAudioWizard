import os
import datetime
import numpy as np
from fpdf import FPDF
import logging
import unicodedata

logger = logging.getLogger(__name__)

def remove_accents(text):
    """Remove accents and special characters from text for PDF compatibility."""
    if isinstance(text, str):
        # Normalize unicode characters and remove accents
        normalized = unicodedata.normalize('NFD', text)
        ascii_text = normalized.encode('ascii', 'ignore').decode('ascii')
        # Replace common problematic characters
        ascii_text = ascii_text.replace('ç', 'c').replace('Ç', 'C')
        return ascii_text
    return str(text)

def generate_pdf_report(frequencies, pdf_filename, aroma_id, company_name, output_dir):
    """Generate a comprehensive PDF report."""
    try:
        if not frequencies or len(frequencies) == 0:
            raise ValueError("No frequencies provided for PDF generation")
            
        pdf = FPDF()
        pdf.add_page()
        # Use Arial font with latin-1 encoding
        pdf.set_font("Arial", size=12)
        pdf.set_title(remove_accents("NeuroAudio Technical Report"))

        # Header
        pdf.cell(200, 10, txt="NeuroAudio Technical Report", ln=True, align='C')
        pdf.ln(10)

        # Company logo space
        pdf.set_font("Arial", size=10)
        pdf.cell(200, 5, txt="Professional Audio Frequency Processing Platform", ln=True, align='C')
        pdf.ln(10)

        # Basic Information
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 8, txt="PROCESSING SUMMARY", ln=True)
        pdf.ln(5)
        
        pdf.set_font("Arial", size=10)
        info_items = [
            f"Company: {remove_accents(company_name)}",
            f"Aroma ID: {remove_accents(aroma_id)}",
            f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Total Frequencies: {len(frequencies)}",
            f"Audio Duration: 30 seconds",
            f"Sample Rate: 44.1 kHz",
            f"Output Format: MP3 (192 kbps)"
        ]
        
        for item in info_items:
            pdf.cell(200, 6, txt=remove_accents(item), ln=True)
        
        pdf.ln(10)

        # Frequency Statistics
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 8, txt="FREQUENCY ANALYSIS", ln=True)
        pdf.ln(5)
        
        pdf.set_font("Arial", size=10)
        freq_min = float(np.min(frequencies))
        freq_max = float(np.max(frequencies))
        freq_mean = float(np.mean(frequencies))
        freq_std = float(np.std(frequencies))
        
        stats_items = [
            f"Minimum Frequency: {freq_min:.6f} THz",
            f"Maximum Frequency: {freq_max:.6f} THz", 
            f"Mean Frequency: {freq_mean:.6f} THz",
            f"Standard Deviation: {freq_std:.6f} THz",
            f"Frequency Range: {freq_max - freq_min:.6f} THz"
        ]
        
        for item in stats_items:
            pdf.cell(200, 6, txt=item, ln=True)
        
        pdf.ln(10)

        # Histograma de Frequencias
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 8, txt=remove_accents("HISTOGRAMA DE FREQUENCIAS"), ln=True)
        pdf.ln(5)
        
        pdf.set_font("Arial", size=8)
        
        # Criar bins para o histograma
        freq_array = np.array(frequencies)
        hist, bin_edges = np.histogram(freq_array, bins=8)
        
        # Desenhar histograma simples em texto
        max_count = max(hist) if len(hist) > 0 else 1
        
        for i, (count, start, end) in enumerate(zip(hist, bin_edges[:-1], bin_edges[1:])):
            # Barra visual usando caracteres ASCII seguros
            bar_length = int((count / max_count) * 30) if max_count > 0 else 0
            bar = "#" * bar_length + "-" * (30 - bar_length)
            
            range_text = f"{start:.3f}-{end:.3f} THz"
            pdf.cell(40, 4, txt=range_text, ln=False)
            pdf.cell(40, 4, txt=bar, ln=False)
            pdf.cell(15, 4, txt=f"({count})", ln=True)
        
        pdf.ln(10)

        # Technical Parameters
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 8, txt="TECHNICAL PARAMETERS", ln=True)
        pdf.ln(5)
        
        pdf.set_font("Arial", size=10)
        tech_items = [
            f"Audio Frequency Range: 18.0 - 22.0 kHz",
            f"Volume Level: -10 dB",
            f"Processing Method: Sine Wave Generation", 
            f"Overlay Mode: Additive Synthesis",
            f"Export Quality: High (192 kbps)",
            f"Engine Version: v2.1.3"
        ]
        
        for item in tech_items:
            pdf.cell(200, 6, txt=item, ln=True)
        
        pdf.ln(10)

        # Frequency Sample (first 20)
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 8, txt="FREQUENCY SAMPLE (First 20 entries)", ln=True)
        pdf.ln(5)
        
        pdf.set_font("Arial", size=8)
        sample_freqs = frequencies[:20]
        for i, freq in enumerate(sample_freqs, 1):
            pdf.cell(100, 4, txt=f"{i:2d}. {float(freq):.6f} THz", ln=True if i % 2 == 0 else False)
            if i % 2 == 1 and i < len(sample_freqs):
                pdf.cell(0, 4, txt=f"{i+1:2d}. {float(sample_freqs[i]):.6f} THz", ln=True)
        
        if len(sample_freqs) % 2 == 1:
            pdf.ln(4)
        
        pdf.ln(10)

        # Footer
        pdf.ln(20)
        pdf.set_font("Arial", size=8)
        pdf.cell(200, 4, txt="This report was generated automatically by the NeuroAudio processing system.", ln=True, align='C')
        pdf.cell(200, 4, txt="For technical support, please contact the development team.", ln=True, align='C')

        # Save PDF
        pdf_path = os.path.join(output_dir, pdf_filename)
        pdf.output(pdf_path)
        
        if not os.path.exists(pdf_path):
            raise RuntimeError(f"PDF file was not created: {pdf_path}")
            
        logger.info(f"PDF report generated: {os.path.getsize(pdf_path)} bytes")
        return pdf_path
        
    except Exception as e:
        logger.error(f"Error generating PDF: {e}")
        raise
