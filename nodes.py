"""
Comparador de Vídeo S2 — node para o ComfyUI.

Mostra dois vídeos (A e B) sobrepostos, com um divisor arrastável estilo
antes/depois, play/pause sincronizado, barra de progresso e mute individual:
o mesmo funcionamento do Comparador_De_Video_S2.html.

Os vídeos chegam de duas formas:
  * pelas entradas VIDEO do node (este arquivo grava uma cópia na pasta temp
    e avisa a interface onde ela está);
  * soltando/escolhendo arquivos direto na interface do node (isso roda todo
    no navegador, em web/comparador_video_s2.js — não passa pelo servidor).
"""
from __future__ import annotations

import glob
import logging
import os
import re
import shutil
import uuid

import folder_paths

log = logging.getLogger("ComparadorVideoS2")

_PREFIXO = "cvs2"
# Extensões que o navegador costuma tocar direto, usadas só no plano B (arquivo original).
_EXT_NAVEGADOR = {".mp4", ".m4v", ".webm", ".mov", ".ogv"}


def _tag_do_no(unique_id) -> str:
    """Id do node em formato seguro para nome de arquivo (ids de subgraph têm ':')."""
    return re.sub(r"[^0-9A-Za-z]+", "_", str(unique_id)) or "x"


def _remover(caminho: str) -> None:
    try:
        os.remove(caminho)
    except OSError:
        pass  # no Windows o arquivo pode estar aberto pelo navegador


def _limpar_antigos(tag: str, lado: str) -> None:
    """Apaga os temporários que este mesmo node/lado gerou em execuções anteriores."""
    pasta = glob.escape(folder_paths.get_temp_directory())
    for caminho in glob.glob(os.path.join(pasta, f"{_PREFIXO}_{tag}_{lado}_*")):
        _remover(caminho)


def _arquivo_original(video):
    """Caminho do arquivo por trás do VIDEO, se ele for um arquivo tocável no navegador."""
    try:
        fonte = video.get_stream_source()
    except Exception:
        return None
    if (
        isinstance(fonte, str)
        and os.path.isfile(fonte)
        and os.path.splitext(fonte)[1].lower() in _EXT_NAVEGADOR
    ):
        return fonte
    return None


def _publicar(video, tag: str, lado: str) -> dict:
    """Grava o VIDEO na pasta temp e devolve a referência usada pelo /view."""
    pasta = folder_paths.get_temp_directory()
    os.makedirs(pasta, exist_ok=True)
    _limpar_antigos(tag, lado)

    base = f"{_PREFIXO}_{tag}_{lado}_{uuid.uuid4().hex[:10]}"
    destino = os.path.join(pasta, base + ".mp4")
    try:
        # save_to() respeita trim/crop do VIDEO; num arquivo "puro" é só um remux
        # (copia os streams sem recodificar), então não perde qualidade.
        video.save_to(destino)
    except Exception as erro:
        _remover(destino)
        origem = _arquivo_original(video)
        if origem is None:
            raise
        log.warning("save_to falhou (%s); usando o arquivo original de %s.", erro, lado.upper())
        destino = os.path.join(pasta, base + os.path.splitext(origem)[1].lower())
        shutil.copyfile(origem, destino)

    return {"filename": os.path.basename(destino), "subfolder": "", "type": "temp"}


class ComparadorVideoS2:
    CATEGORY = "video"
    FUNCTION = "comparar"
    OUTPUT_NODE = True
    RETURN_TYPES = ()
    DESCRIPTION = (
        "Compara dois vídeos com um divisor arrastável (antes/depois). "
        "Ligue as entradas A e B, ou solte os arquivos direto no node."
    )

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "video_a": ("VIDEO", {"tooltip": "Vídeo A (lado esquerdo do divisor)."}),
                "video_b": ("VIDEO", {"tooltip": "Vídeo B (lado direito do divisor)."}),
                "autoplay": (
                    "BOOLEAN",
                    {
                        "default": False,
                        "tooltip": "Reproduz A e B automaticamente quando a execução termina.",
                    },
                ),
            },
            "hidden": {"unique_id": "UNIQUE_ID"},
        }

    def comparar(self, video_a=None, video_b=None, autoplay=False, unique_id=None):
        tag = _tag_do_no(unique_id)
        ui = {"cvs2_a": [], "cvs2_b": []}
        for lado, video in (("a", video_a), ("b", video_b)):
            if video is None:
                continue  # entrada desligada: a interface mantém o que já estiver carregado
            try:
                ui[f"cvs2_{lado}"].append(_publicar(video, tag, lado))
            except Exception as erro:  # um lado com problema não derruba o outro
                log.exception("Não foi possível preparar o vídeo %s.", lado.upper())
                ui[f"cvs2_{lado}"].append({"error": f"{type(erro).__name__}: {erro}"})
        return {"ui": ui}


NODE_CLASS_MAPPINGS = {"ComparadorVideoS2": ComparadorVideoS2}
NODE_DISPLAY_NAME_MAPPINGS = {"ComparadorVideoS2": "Comparador de Vídeo S2"}
