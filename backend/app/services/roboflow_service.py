import os
import json
import base64
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
from PIL import Image
import io

logger = logging.getLogger(__name__)

# Roboflow Workflow Configuration
ROBOFLOW_API_URL = os.getenv("ROBOFLOW_API_URL", "https://detect.roboflow.com")
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "ihcK74KhpxtPIwfsGMvK")
ROBOFLOW_WORKSPACE = os.getenv("ROBOFLOW_WORKSPACE", "aditi-patil-8ubn1")
ROBOFLOW_WORKFLOW_ID = os.getenv(
    "ROBOFLOW_WORKFLOW_ID",
    "construction-progress-monitoring-vconstruction-progress-monitoring-ibhzf-1-yolo26n-seg-t1-logic"
)

# Search locations for local trained YOLO weights
LOCAL_MODEL_PATHS = [
    Path(r"c:\Users\Aditi\OneDrive\Desktop\Infrastructure Project Management\Infrastructure_management_model\runs\construction_yolov8_scratch-3\weights\best.pt"),
    Path(r"c:\Users\Aditi\OneDrive\Desktop\Infrastructure Project Management\Infrastructure_management_model\runs\construction_yolov8_scratch_fast\weights\best.pt"),
    Path(r"c:\Users\Aditi\OneDrive\Desktop\Infrastructure Project Management\Infrastructure_management_model\weights\best.pt"),
    Path(__file__).resolve().parents[3] / "Infrastructure_management_model" / "runs" / "construction_yolov8_scratch-3" / "weights" / "best.pt",
    Path(__file__).resolve().parents[3] / "Infrastructure_management_model" / "runs" / "construction_yolov8_scratch_fast" / "weights" / "best.pt",
]

# Construction element categories and their contribution weights to overall progress
ELEMENT_PROGRESS_WEIGHTS = {
    # Custom 18 Trained Classes from data.yaml
    "beam": {"phase": "structural", "weight": 0.20, "label": "Structural Beam"},
    "ceiling": {"phase": "finishing", "weight": 0.15, "label": "Ceiling Structure"},
    "column": {"phase": "structural", "weight": 0.20, "label": "Structural Column"},
    "wall": {"phase": "structural", "weight": 0.20, "label": "Wall Structure"},
    "brick": {"phase": "structural", "weight": 0.20, "label": "Brickwork Wall"},
    "brickwork": {"phase": "structural", "weight": 0.20, "label": "Brickwork Wall"},
    "masonry": {"phase": "structural", "weight": 0.20, "label": "Masonry Wall"},
    "block": {"phase": "structural", "weight": 0.20, "label": "Block Work Wall"},
    "blockwork": {"phase": "structural", "weight": 0.20, "label": "Block Work Wall"},
    "beam-concrete": {"phase": "finishing", "weight": 0.25, "label": "Concrete Beam"},
    "beam-formwork": {"phase": "structural", "weight": 0.15, "label": "Formwork Beam"},
    "beam-rebar": {"phase": "structural", "weight": 0.20, "label": "Rebar Beam"},
    "columns-concrete": {"phase": "finishing", "weight": 0.25, "label": "Concrete Column"},
    "columns-formwork": {"phase": "structural", "weight": 0.15, "label": "Formwork Column"},
    "columns-rebar": {"phase": "structural", "weight": 0.20, "label": "Rebar Column"},
    "concrete": {"phase": "finishing", "weight": 0.25, "label": "Concrete Pour"},
    "formwork": {"phase": "structural", "weight": 0.15, "label": "Formwork / Shuttering"},
    "frame": {"phase": "structural", "weight": 0.15, "label": "Structural Frame"},
    "rebar": {"phase": "structural", "weight": 0.20, "label": "Reinforcement / Rebar"},
    "tiles": {"phase": "finishing", "weight": 0.25, "label": "Tiles / Flooring"},
    "wall-concrete": {"phase": "finishing", "weight": 0.25, "label": "Concrete Wall"},
    "wall-formwork": {"phase": "structural", "weight": 0.15, "label": "Formwork Wall"},
    "wall-rebar": {"phase": "structural", "weight": 0.20, "label": "Rebar Wall"},
    # Generic terms fallback
    "reinforcement": {"phase": "structural", "weight": 0.20, "label": "Reinforcement / Rebar"},
    "shuttering": {"phase": "structural", "weight": 0.15, "label": "Formwork / Shuttering"},
    "scaffold": {"phase": "support", "weight": 0.05, "label": "Scaffolding"},
    "scaffolding": {"phase": "support", "weight": 0.05, "label": "Scaffolding"},
    "pipe": {"phase": "mechanical", "weight": 0.20, "label": "Piping"},
    "spool": {"phase": "mechanical", "weight": 0.20, "label": "Spool / Pipe Segment"},
    "weld": {"phase": "mechanical", "weight": 0.15, "label": "Weld Joint"},
    "crane": {"phase": "equipment", "weight": 0.05, "label": "Crane / Heavy Lift"},
    "excavation": {"phase": "earthwork", "weight": 0.10, "label": "Excavation"},
    "pile": {"phase": "foundation", "weight": 0.20, "label": "Pile / Foundation"},
    "slab": {"phase": "structural", "weight": 0.20, "label": "Slab / Deck"},
    "worker": {"phase": "activity", "weight": 0.02, "label": "Worker / Personnel"},
    "vehicle": {"phase": "equipment", "weight": 0.02, "label": "Vehicle / Equipment"},
}


def strip_base64_header(data_uri: str) -> str:
    """Strip data URI header (data:image/jpeg;base64,...) and return raw base64."""
    if data_uri.startswith("data:"):
        parts = data_uri.split(",", 1)
        if len(parts) == 2:
            return parts[1]
    return data_uri


def load_image_from_input(image_input: str) -> Optional[Image.Image]:
    """Convert base64 data URI, file path, or URL into PIL Image and downscale to 640x640 for fast processing."""
    try:
        img = None
        if image_input.startswith("data:image"):
            b64_str = strip_base64_header(image_input)
            img_data = base64.b64decode(b64_str)
            img = Image.open(io.BytesIO(img_data)).convert("RGB")
        elif os.path.exists(image_input):
            img = Image.open(image_input).convert("RGB")
        elif image_input.startswith("http://") or image_input.startswith("https://"):
            import requests
            resp = requests.get(image_input, timeout=3)
            if resp.status_code == 200:
                img = Image.open(io.BytesIO(resp.content)).convert("RGB")

        if img:
            # Downscale image to max 640x640 to make AI analysis 10x-100x faster
            img.thumbnail((640, 640), Image.Resampling.LANCZOS)
            return img
    except Exception as e:
        logger.error(f"Error loading image input: {e}")
    return None


def parse_roboflow_result(raw_result: Any) -> Dict[str, Any]:
    """
    Parse workflow or YOLO detection result into structured analysis:
    - detected_elements: list of {class, confidence, count, label, phase}
    - progress_estimate: float 0-100
    - overall_confidence: float 0-1
    - summary: human-readable string
    """
    detected_elements = []
    all_confidences = []
    detected_classes = set()

    try:
        results_list = raw_result if isinstance(raw_result, list) else [raw_result]

        for result_item in results_list:
            if not isinstance(result_item, dict):
                continue

            predictions = (
                result_item.get("predictions", []) or
                result_item.get("output", {}).get("predictions", []) or
                result_item.get("result", {}).get("predictions", []) or
                []
            )

            if not predictions:
                for key in result_item:
                    val = result_item[key]
                    if isinstance(val, dict) and "predictions" in val:
                        predictions = val["predictions"]
                        break
                    elif isinstance(val, list) and len(val) > 0 and isinstance(val[0], dict) and "class" in val[0]:
                        predictions = val
                        break

            class_counts = {}
            class_confidences = {}

            for pred in predictions:
                if not isinstance(pred, dict):
                    continue
                cls = pred.get("class", pred.get("class_name", "unknown")).lower().strip()
                conf = float(pred.get("confidence", pred.get("score", 0.0)))
                all_confidences.append(conf)
                detected_classes.add(cls)

                if cls not in class_counts:
                    class_counts[cls] = 0
                    class_confidences[cls] = []
                class_counts[cls] += 1
                class_confidences[cls].append(conf)

            for cls, count in class_counts.items():
                avg_conf = sum(class_confidences[cls]) / len(class_confidences[cls])
                element_info = ELEMENT_PROGRESS_WEIGHTS.get(cls, {"phase": "other", "weight": 0.05, "label": cls.title()})
                detected_elements.append({
                    "class": cls,
                    "count": count,
                    "confidence": round(avg_conf, 3),
                    "label": element_info["label"],
                    "phase": element_info["phase"],
                    "weight": element_info["weight"]
                })

    except Exception as e:
        logger.error(f"Error parsing detection result: {e}", exc_info=True)

    progress_estimate = _calculate_progress(detected_elements)
    overall_confidence = round(sum(all_confidences) / max(len(all_confidences), 1), 3)

    if detected_elements:
        top_elements = sorted(detected_elements, key=lambda x: x["count"], reverse=True)[:4]
        element_strs = [f"{e['label']} ({e['count']}x, {int(e['confidence']*100)}%)" for e in top_elements]
        summary = f"Detected: {', '.join(element_strs)}. Estimated progress: {progress_estimate}%."
    else:
        summary = "No visual construction elements detected in this image."
        progress_estimate = None

    return {
        "detected_elements": detected_elements,
        "progress_estimate": progress_estimate,
        "overall_confidence": overall_confidence if detected_elements else 0.0,
        "summary": summary,
        "raw_classes": list(detected_classes)
    }


def _calculate_progress(detected_elements: List[Dict]) -> Optional[float]:
    """Estimate construction progress % based on detected elements."""
    if not detected_elements:
        return None

    phase_order = {
        "earthwork": 10,
        "foundation": 20,
        "support": 25,
        "structural": 50,
        "mechanical": 55,
        "finishing": 80,
        "equipment": 15,
        "activity": 10,
        "other": 30
    }

    max_phase_progress = 0
    total_weighted_score = 0
    total_weight = 0

    for elem in detected_elements:
        phase = elem.get("phase", "other")
        base_progress = phase_order.get(phase, 30)
        weight = elem.get("weight", 0.05)
        conf = elem.get("confidence", 0.5)
        count = elem.get("count", 1)

        count_boost = min(count / 5.0, 1.0) * 15

        element_progress = base_progress + count_boost
        total_weighted_score += element_progress * weight * conf
        total_weight += weight * conf

        if element_progress > max_phase_progress:
            max_phase_progress = element_progress

    if total_weight > 0:
        weighted_avg = total_weighted_score / total_weight
        progress = 0.6 * max_phase_progress + 0.4 * weighted_avg
    else:
        progress = max_phase_progress

    return round(min(progress, 100.0), 1)


def analyze_visual_construction_features(image_input: str) -> List[Dict[str, Any]]:
    """
    Fallback visual feature extractor: Analyzes color profiles & textures of construction images 
    (red clay brick walls, concrete structures, scaffolding, dark rebar lines).
    """
    pil_img = load_image_from_input(image_input)
    if not pil_img:
        return []

    try:
        import numpy as np
        img_resized = pil_img.resize((300, 300)).convert("RGB")
        arr = np.array(img_resized, dtype=float)

        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

        # Terracotta / Red Brick / Clay Block Wall mask
        brick_mask = (r > 75) & (r > g * 1.05) & (r > b * 1.15) & ((r - b) > 20) & (b < 160)
        brick_ratio = float(np.sum(brick_mask) / (300 * 300))

        # Grey Concrete / Mortar / Plaster mask
        rgb_std = np.std(arr, axis=2)
        rgb_mean = np.mean(arr, axis=2)
        concrete_mask = (rgb_std < 25) & (rgb_mean > 60) & (rgb_mean < 215)
        concrete_ratio = float(np.sum(concrete_mask) / (300 * 300))

        # Dark Steel / Scaffolding Lines
        steel_mask = (rgb_mean < 70) & (rgb_std < 18)
        steel_ratio = float(np.sum(steel_mask) / (300 * 300))

        detected = []

        if brick_ratio >= 0.03:
            conf = round(min(0.70 + brick_ratio * 0.5, 0.92), 2)
            detected.append({
                "class": "wall",
                "count": max(int(brick_ratio * 10), 1),
                "confidence": conf,
                "label": "Brickwork / Clay Block Wall",
                "phase": "structural",
                "weight": 0.20
            })

        if concrete_ratio >= 0.12:
            conf = round(min(0.65 + concrete_ratio * 0.4, 0.88), 2)
            detected.append({
                "class": "concrete",
                "count": 1,
                "confidence": conf,
                "label": "Concrete Structure",
                "phase": "structural",
                "weight": 0.20
            })

        if steel_ratio >= 0.04:
            conf = round(min(0.60 + steel_ratio * 0.4, 0.85), 2)
            detected.append({
                "class": "scaffold",
                "count": 1,
                "confidence": conf,
                "label": "Scaffolding / Framework",
                "phase": "support",
                "weight": 0.05
            })

        return detected
    except Exception as e:
        logger.error(f"Error in visual feature analysis: {e}")
        return []


class RoboflowInferenceService:
    def __init__(
        self,
        api_url: str = ROBOFLOW_API_URL,
        api_key: str = ROBOFLOW_API_KEY,
        workspace_name: str = ROBOFLOW_WORKSPACE,
        workflow_id: str = ROBOFLOW_WORKFLOW_ID
    ):
        self.api_url = api_url
        self.api_key = api_key
        self.workspace_name = workspace_name
        self.workflow_id = workflow_id
        self._client = None
        self._local_yolo_model = None
        self._local_model_path = None

    def _get_local_model(self):
        """Attempts to load the trained YOLOv8 model locally."""
        if self._local_yolo_model is not None:
            return self._local_yolo_model

        for p in LOCAL_MODEL_PATHS:
            if p.exists():
                try:
                    from ultralytics import YOLO
                    logger.info(f"Loading local trained YOLOv8 model from {p}")
                    self._local_yolo_model = YOLO(str(p))
                    self._local_model_path = str(p)
                    return self._local_yolo_model
                except Exception as e:
                    logger.warning(f"Failed loading local model at {p}: {e}")
        return None

    def run_local_inference(self, image_input: str) -> Optional[list]:
        """Run inference using the locally trained YOLO model."""
        model = self._get_local_model()
        if not model:
            return None

        pil_img = load_image_from_input(image_input)
        if not pil_img:
            logger.warning("Could not load PIL image for local YOLO inference")
            return None

        try:
            results = model.predict(source=pil_img, imgsz=320, conf=0.10, verbose=False)
            predictions = []
            for r in results:
                if hasattr(r, 'boxes') and r.boxes is not None:
                    for box in r.boxes:
                        cls_id = int(box.cls[0].item()) if hasattr(box.cls, '__len__') else int(box.cls.item())
                        cls_name = model.names.get(cls_id, str(cls_id))
                        conf = float(box.conf[0].item()) if hasattr(box.conf, '__len__') else float(box.conf.item())
                        xyxy = box.xyxy[0].tolist() if hasattr(box, 'xyxy') else []
                        predictions.append({
                            "class": cls_name,
                            "confidence": round(conf, 3),
                            "box": xyxy
                        })
            logger.info(f"Local YOLOv8 model detected {len(predictions)} elements from custom weights ({self._local_model_path})")
            return [{"predictions": predictions}]
        except Exception as e:
            logger.error(f"Error during local YOLO inference: {e}", exc_info=True)
            return None

    def _get_client(self):
        """Lazy-init the Roboflow client."""
        if self._client is None:
            try:
                from inference_sdk import InferenceHTTPClient
                self._client = InferenceHTTPClient(
                    api_url=self.api_url,
                    api_key=self.api_key
                )
            except ImportError:
                logger.warning("inference_sdk not installed.")
                self._client = None
        return self._client

    def run_workflow(self, image_input: Union[str, Dict[str, Any]], use_cache: bool = True) -> Dict[str, Any]:
        """Runs local trained YOLO model first, then Roboflow cloud API, or returns empty prediction list."""
        # 1. Try local trained YOLOv8 model first!
        if isinstance(image_input, str):
            local_res = self.run_local_inference(image_input)
            if local_res:
                return local_res

        # 2. Try Roboflow Workflow Cloud API with downscaled payload
        client = self._get_client()
        if client and isinstance(image_input, str):
            # Downscale payload if base64 URI
            if image_input.startswith("data:image"):
                pil_img = load_image_from_input(image_input)
                if pil_img:
                    buf = io.BytesIO()
                    pil_img.save(buf, format="JPEG", quality=75)
                    b64_str = base64.b64encode(buf.getvalue()).decode()
                    image_input = b64_str
                else:
                    image_input = strip_base64_header(image_input)

        if client:
            import concurrent.futures
            try:
                images_payload = {"image": image_input} if isinstance(image_input, str) else image_input
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(
                        client.run_workflow,
                        workspace_name=self.workspace_name,
                        workflow_id=self.workflow_id,
                        images=images_payload,
                        use_cache=use_cache
                    )
                    # Limit cloud API wait time to 12 seconds max (was 1.0s — too aggressive, always timed out)
                    result = future.result(timeout=12.0)
                    return result
            except concurrent.futures.TimeoutError:
                logger.warning("Roboflow cloud API request timed out (>12.0s). Using fast local vision feature detection.")
            except Exception as e:
                logger.error(f"Roboflow inference error: {str(e)}")

        # No predictions if model/API returns no detections
        return [{"predictions": []}]

    def analyze_image(self, image_input: str, use_cache: bool = True) -> Dict[str, Any]:
        """Ultra-fast hybrid pipeline: fast visual feature analysis (~30ms) + ML Vision Model."""
        # 1. Fast visual feature extraction (~30ms)
        visual_elems = analyze_visual_construction_features(image_input)
        if visual_elems and any(e.get("confidence", 0) >= 0.70 for e in visual_elems):
            progress_est = _calculate_progress(visual_elems)
            overall_conf = round(sum(e["confidence"] for e in visual_elems) / len(visual_elems), 3)
            top_elements = sorted(visual_elems, key=lambda x: x["confidence"], reverse=True)[:3]
            element_strs = [f"{e['label']} ({e['count']}x, {int(e['confidence']*100)}%)" for e in top_elements]
            summary = f"Visual Feature Detection: {', '.join(element_strs)}. Estimated progress: {progress_est}%."
            return {
                "detected_elements": visual_elems,
                "progress_estimate": progress_est,
                "overall_confidence": overall_conf,
                "summary": summary,
                "raw_classes": [e["class"] for e in visual_elems],
                "raw_workflow_result": [{"predictions": []}]
            }

        # 2. Secondary ML Vision Model pass
        raw_result = self.run_workflow(image_input, use_cache)
        parsed = parse_roboflow_result(raw_result)

        # Fallback to visual feature analysis if no object bounding box detected
        if not parsed.get("detected_elements") and visual_elems:
            parsed["detected_elements"] = visual_elems
            parsed["progress_estimate"] = _calculate_progress(visual_elems)
            parsed["overall_confidence"] = round(sum(e["confidence"] for e in visual_elems) / len(visual_elems), 3)
            top_elements = sorted(visual_elems, key=lambda x: x["confidence"], reverse=True)[:3]
            element_strs = [f"{e['label']} ({e['count']}x, {int(e['confidence']*100)}%)" for e in top_elements]
            parsed["summary"] = f"Visual Feature Detection: {', '.join(element_strs)}. Estimated progress: {parsed['progress_estimate']}%."
            parsed["raw_classes"] = [e["class"] for e in visual_elems]

        parsed["raw_workflow_result"] = raw_result
        return parsed


# Singleton service instance
roboflow_service = RoboflowInferenceService()

# Top-level module function wrappers
def analyze_image(image_input: str, use_cache: bool = True) -> Dict[str, Any]:
    return roboflow_service.analyze_image(image_input, use_cache)

def run_workflow(image_input: Union[str, Dict[str, Any]], use_cache: bool = True) -> Dict[str, Any]:
    return roboflow_service.run_workflow(image_input, use_cache)

