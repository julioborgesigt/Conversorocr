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

        # Inicializar PaddleOCR
        # use_textline_orientation substitui use_angle_cls (deprecated)
        ocr = PaddleOCR(
            use_textline_orientation=True,
            lang=lang
        )

        # Processar imagem
        result = ocr.ocr(image_path)

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

        # --- INÍCIO DA CORREÇÃO PADDLEX ---

        # A lista de dados OCR. Por padrão, é result[0]
        ocr_data_list = result[0]

        # Verificar se o resultado é um objeto OCRResult do PaddleX
        if ocr_data_list and hasattr(ocr_data_list, '__class__') and ocr_data_list.__class__.__name__ == 'OCRResult':
            sys.stderr.write("INFO: Detectado formato PaddleX (OCRResult). Convertendo...\n")
            sys.stderr.flush()

            # Tentar múltiplas formas de acessar os dados
            transformed_list = []

            # Método 1: Tentar acessar .data
            if hasattr(ocr_data_list, 'data') and ocr_data_list.data:
                sys.stderr.write("INFO: Acessando via .data\n")
                sys.stderr.flush()

                # Formato PaddleX: [ {'box': [[...]], 'text': '...', 'score': ...}, ... ]
                # Converter para formato PaddleOCR padrão: [ [box, (text, score)], ... ]
                for item in ocr_data_list.data:
                    if isinstance(item, dict) and 'box' in item and 'text' in item and 'score' in item:
                        transformed_list.append([
                            item['box'],
                            (item['text'], item['score'])
                        ])

            # Método 2: Tentar iterar diretamente (se for iterável)
            elif hasattr(ocr_data_list, '__iter__'):
                sys.stderr.write("INFO: OCRResult é iterável, tentando iterar...\n")
                sys.stderr.flush()

                try:
                    item_count = 0
                    for item in ocr_data_list:
                        item_count += 1
                        if item_count <= 3:  # Mostrar apenas os 3 primeiros
                            sys.stderr.write(f"INFO: Item {item_count}: tipo={type(item)}, valor={str(item)[:200]}\n")
                            if isinstance(item, dict):
                                sys.stderr.write(f"INFO: Item {item_count} é dict com chaves: {list(item.keys())}\n")

                        if isinstance(item, dict) and 'box' in item and 'text' in item and 'score' in item:
                            transformed_list.append([
                                item['box'],
                                (item['text'], item['score'])
                            ])

                    sys.stderr.write(f"INFO: Total de itens iterados: {item_count}\n")
                    sys.stderr.flush()
                except Exception as e:
                    sys.stderr.write(f"WARN: Erro ao iterar: {e}\n")
                    import traceback
                    sys.stderr.write(f"TRACEBACK: {traceback.format_exc()}\n")
                    sys.stderr.flush()

            # Método 3: Explorar outros atributos comuns
            else:
                sys.stderr.write("INFO: Explorando atributos do OCRResult...\n")
                attrs = [attr for attr in dir(ocr_data_list) if not attr.startswith('_')]
                sys.stderr.write(f"INFO: Atributos públicos: {attrs[:15]}\n")
                sys.stderr.flush()

                # Tentar atributos comuns
                for attr_name in ['boxes', 'texts', 'scores', 'results', 'detections']:
                    if hasattr(ocr_data_list, attr_name):
                        attr_value = getattr(ocr_data_list, attr_name)
                        sys.stderr.write(f"INFO: Tentando usar .{attr_name} (tipo: {type(attr_value)})\n")
                        sys.stderr.flush()

            if transformed_list:
                sys.stderr.write(f"INFO: Convertido {len(transformed_list)} itens do PaddleX\n")
                sys.stderr.flush()
                ocr_data_list = transformed_list
            else:
                sys.stderr.write("WARN: Não conseguiu extrair dados do OCRResult, retornando vazio\n")
                sys.stderr.flush()
                ocr_data_list = []

        # --- FIM DA CORREÇÃO PADDLEX ---

        # O loop original agora processa 'ocr_data_list'
        # que estará no formato correto, seja do PaddleOCR ou do PaddleX
        for line in ocr_data_list:
            try:
                # Formato PaddleOCR: [[[x1,y1], [x2,y2], [x3,y3], [x4,y4]], (text, confidence)]
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
                sys.stderr.write(f"WARN: Erro ao processar linha: {e}\n")
                continue

        # Calcular confiança média
        avg_confidence = (total_confidence / word_count * 100) if word_count > 0 else 0

        sys.stderr.write(f"INFO: Total de palavras extraídas: {word_count}\n")
        sys.stderr.flush()

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
        import traceback
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
