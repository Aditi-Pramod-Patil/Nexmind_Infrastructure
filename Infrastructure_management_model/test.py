from pathlib import Path
from ultralytics import YOLO
import yaml
import torch

# ============================================================
# PATHS
# ============================================================

MODEL_PATH = Path(
    r"C:\Users\Aditi\OneDrive\Desktop\Infrastructure_management_model\runs\construction_yolov8_scratch_fast\weights\best.pt"
)

DATA_YAML = Path(
    r"C:\Users\Aditi\dataset\data.yaml"
)

PROJECT_DIR = Path(
    r"C:\Users\Aditi\OneDrive\Desktop\Infrastructure_management_model"
)

# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print("YOLOv8 CONSTRUCTION MODEL - TESTING")
    print("=" * 70)

    # --------------------------------------------------------
    # Check files
    # --------------------------------------------------------

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"\nModel not found:\n{MODEL_PATH}"
        )

    if not DATA_YAML.exists():
        raise FileNotFoundError(
            f"\nData YAML not found:\n{DATA_YAML}"
        )

    # --------------------------------------------------------
    # Device
    # --------------------------------------------------------

    if torch.cuda.is_available():
        DEVICE = 0

        print("\nGPU detected:")
        print(torch.cuda.get_device_name(0))

    else:
        DEVICE = "cpu"

        print("\nWARNING: GPU not detected.")
        print("Testing will run on CPU.")

    # --------------------------------------------------------
    # Load dataset configuration
    # --------------------------------------------------------

    with open(DATA_YAML, "r", encoding="utf-8") as f:
        data_config = yaml.safe_load(f)

    print("\nClasses:")

    for i, name in enumerate(data_config["names"]):
        print(f"  {i}: {name}")

    # --------------------------------------------------------
    # Load trained model
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("LOADING TRAINED MODEL")
    print("=" * 70)

    model = YOLO(str(MODEL_PATH))

    print("\nModel loaded:")
    print(MODEL_PATH)

    # ========================================================
    # 1. VALIDATION SET EVALUATION
    # ========================================================

    print("\n" + "=" * 70)
    print("VALIDATION SET EVALUATION")
    print("=" * 70)

    val_metrics = model.val(
        data=str(DATA_YAML),
        split="val",
        imgsz=512,
        batch=16,
        device=DEVICE,
        workers=4,
        plots=True,
        verbose=True
    )

    print("\n" + "=" * 70)
    print("VALIDATION RESULTS")
    print("=" * 70)

    print(f"\nPrecision : {val_metrics.box.mp:.4f}")
    print(f"Recall    : {val_metrics.box.mr:.4f}")
    print(f"mAP50     : {val_metrics.box.map50:.4f}")
    print(f"mAP50-95  : {val_metrics.box.map:.4f}")

    # ========================================================
    # 2. TEST SET EVALUATION
    # ========================================================

    if "test" in data_config:

        print("\n" + "=" * 70)
        print("TEST SET EVALUATION")
        print("=" * 70)

        test_metrics = model.val(
            data=str(DATA_YAML),
            split="test",
            imgsz=512,
            batch=16,
            device=DEVICE,
            workers=4,
            plots=True,
            verbose=True
        )

        print("\n" + "=" * 70)
        print("FINAL TEST RESULTS")
        print("=" * 70)

        print(f"\nPrecision : {test_metrics.box.mp:.4f}")
        print(f"Recall    : {test_metrics.box.mr:.4f}")
        print(f"mAP50     : {test_metrics.box.map50:.4f}")
        print(f"mAP50-95  : {test_metrics.box.map:.4f}")

        # ----------------------------------------------------
        # Per-class results
        # ----------------------------------------------------

        print("\n" + "=" * 70)
        print("PER-CLASS TEST RESULTS")
        print("=" * 70)

        class_names = data_config["names"]

        for i, class_name in enumerate(class_names):

            try:
                print(
                    f"{class_name:25s} "
                    f"mAP50: {test_metrics.box.ap50[i]:.4f}   "
                    f"mAP50-95: {test_metrics.box.ap[i]:.4f}"
                )

            except Exception:
                pass

    else:

        print("\nNo test split found in data.yaml.")

    # ========================================================
    # 3. RUN PREDICTIONS ON TEST IMAGES
    # ========================================================

    print("\n" + "=" * 70)
    print("RUNNING PREDICTIONS ON TEST IMAGES")
    print("=" * 70)

    test_images = Path(
        data_config["path"]
    ) / data_config["test"]

    # Convert to absolute path if required
    if not test_images.is_absolute():
        test_images = Path(data_config["path"]) / data_config["test"]

    print("\nTest images location:")
    print(test_images)

    prediction_results = model.predict(
        source=str(test_images),
        imgsz=512,
        conf=0.25,
        iou=0.45,
        device=DEVICE,
        save=True,
        save_txt=True,
        save_conf=True,
        project=str(PROJECT_DIR / "runs"),
        name="test_predictions",
        verbose=True
    )

    # ========================================================
    # FINISHED
    # ========================================================

    print("\n" + "=" * 70)
    print("TESTING COMPLETED")
    print("=" * 70)

    print("\nModel:")
    print(MODEL_PATH)

    print("\nPrediction results saved at:")

    print(
        PROJECT_DIR /
        "runs" /
        "test_predictions"
    )

    print("\nCheck this folder to see the images")
    print("with bounding boxes drawn by your model.")

    print("\n" + "=" * 70)
    print("TEST COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()