#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script Python para processar OCR usando PaddleOCR
Mantém compatibilidade com interface do ocrWorker.js (Tesseract)
"""

import sys
import json
from pathlib import Path

try:
    from paddleocr import PaddleOCR
    from PIL import Image
except ImportError as e:
    print(json.dumps({
        'success': False,
        'error': f'Módulo não instalado: {str(e)}. Execute: pip install paddleocr pillow'
    }))
    sys.exit(1)

def get_image_dimensions(image_path):
    """Obtém dimensões da imagem"""
    try:
        img = Image.open(image_path)
        return img.width, img.height
    except Exception as e:
        return None, None

def process_image(image_path, lang='pt'):
    """
    Processa uma imagem usando PaddleOCR

    Args:
        image_path: Caminho para a imagem
        lang: Código do idioma ('pt', 'en', 'es', etc.)

    Returns:
        dict: Resultado no formato compatível com Tesseract
    """
    try:
        # Obter dimensões da imagem
        image_width, image_height = get_image_dimensions(image_path)

        if not image_width or not image_height:
            return {
                'success': False,
                'error': 'Não foi possível obter dimensões da imagem'
            }

        # Inicializar PaddleOCR (parâmetros compatíveis com todas as versões)
        # use_angle_cls=True: detecta e corrige rotação de texto
        # lang: idioma do modelo
        # Nota: use_gpu e show_log foram removidos por compatibilidade
        ocr = PaddleOCR(
            use_angle_cls=True,
            lang=lang
        )

        # Processar imagem
        # Nota: cls=True foi removido nas versões 3.3+, use_angle_cls na inicialização já controla isso
        result = ocr.ocr(image_path)

        # Debug: verificar formato do resultado
        import sys
        import traceback
        try:
            if result and result[0]:
                sys.stderr.write(f"DEBUG: Resultado tem {len(result[0])} linhas\n")
                if len(result[0]) > 0:
                    sys.stderr.write(f"DEBUG: Primeira linha: {result[0][0]}\n")
                    sys.stderr.write(f"DEBUG: Tipo da segunda parte: {type(result[0][0][1])}\n")
                sys.stderr.flush()
        except Exception as debug_error:
            sys.stderr.write(f"DEBUG ERROR: {debug_error}\n")
            sys.stderr.write(f"DEBUG TRACEBACK: {traceback.format_exc()}\n")
            sys.stderr.flush()

        if not result or not result[0]:
            return {
                'success': True,
                'data': {
                    'text': '',
                    'confidence': 0,
                    'words': [],
                    'imageWidth': image_width,
                    'imageHeight': image_height
                }
            }

        # Extrair texto e coordenadas
        full_text = []
        words = []
        total_confidence = 0
        word_count = 0

        for line in result[0]:
            try:
                # Formato PaddleOCR: [[[x1,y1], [x2,y2], [x3,y3], [x4,y4]], (text, confidence)]
                # Nas versões 3.3+, pode ser: [box, [text, confidence]] ou [box, (text, confidence)]
                if not line or len(line) < 2:
                    continue

                box = line[0]  # Coordenadas do polígono
                text_data = line[1]  # (texto, confiança) ou [texto, confiança]

                # Extrair texto e confiança (suporta tupla ou lista)
                if isinstance(text_data, (list, tuple)) and len(text_data) >= 2:
                    text = str(text_data[0]) if text_data[0] else ""
                    confidence = float(text_data[1]) if text_data[1] else 0.0
                else:
                    # Formato inesperado, pular
                    continue

                if not text:
                    continue

                # Converter polígono para bbox (x0, y0, x1, y1)
                x_coords = [point[0] for point in box]
                y_coords = [point[1] for point in box]

                x0 = int(min(x_coords))
                y0 = int(min(y_coords))
                x1 = int(max(x_coords))
                y1 = int(max(y_coords))

                # Adicionar ao texto completo
                full_text.append(text)

                # Adicionar palavra com coordenadas (compatível com Tesseract)
                words.append({
                    'text': text,
                    'bbox': {
                        'x0': x0,
                        'y0': y0,
                        'x1': x1,
                        'y1': y1
                    },
                    'confidence': confidence * 100  # PaddleOCR retorna 0-1, converter para 0-100
                })

                total_confidence += confidence
                word_count += 1

            except (IndexError, TypeError, ValueError) as e:
                # Pular linhas com formato inesperado
                continue

        # Calcular confiança média
        avg_confidence = (total_confidence / word_count * 100) if word_count > 0 else 0

        return {
            'success': True,
            'data': {
                'text': '\n'.join(full_text),
                'confidence': avg_confidence,
                'words': words,
                'imageWidth': image_width,
                'imageHeight': image_height
            }
        }

    except Exception as e:
        import sys
        import traceback
        # Mostrar traceback completo no stderr
        sys.stderr.write(f"ERRO FATAL: {type(e).__name__}: {str(e)}\n")
        sys.stderr.write(f"TRACEBACK:\n{traceback.format_exc()}\n")
        sys.stderr.flush()

        return {
            'success': False,
            'error': f"{type(e).__name__}: {str(e)}"
        }

def main():
    """Função principal"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Uso: paddleocr_processor.py <image_path> [lang]'
        }))
        sys.exit(1)

    image_path = sys.argv[1]
    lang = sys.argv[2] if len(sys.argv) > 2 else 'pt'

    # Mapear códigos de idioma
    lang_map = {
        'por': 'pt',
        'eng': 'en',
        'spa': 'es',
        'fra': 'fr',
        'deu': 'german',
        'ita': 'it',
        'rus': 'ru',
        'jpn': 'japan',
        'kor': 'korean',
        'chi_sim': 'ch',  # Chinês simplificado
        'chi_tra': 'chinese_cht'  # Chinês tradicional
    }

    paddle_lang = lang_map.get(lang, lang)

    result = process_image(image_path, paddle_lang)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
