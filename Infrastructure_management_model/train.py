from pathlib import Path

import yaml
import torch
from ultralytics import YOLO


# ============================================================
# PATHS
# ============================================================

DATASET_DIR = Path(r"C:\Users\Aditi\dataset")
DATA_YAML = DATASET_DIR / "data.yaml"

PROJECT_DIR = Path(
    r"C:\Users\Aditi\OneDrive\Desktop\Infrastructure_management_model"
)

RUNS_DIR = PROJECT_DIR / "runs"


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 70)
    print("CONSTRUCTION SITE YOLOv8 - FAST TRAINING FROM SCRATCH")
    print("=" * 70)

    # --------------------------------------------------------
    # Check dataset
    # --------------------------------------------------------

    if not DATA_YAML.exists():
        raise FileNotFoundError(
            f"\nDataset YAML not found:\n{DATA_YAML}"
        )

    print("\nDataset YAML:")
    print(DATA_YAML)

    # --------------------------------------------------------
    # Check GPU
    # --------------------------------------------------------

    if torch.cuda.is_available():

        DEVICE = 0

        print("\nGPU detected:")
        print(torch.cuda.get_device_name(0))

        print("CUDA version:")
        print(torch.version.cuda)

        gpu_memory = torch.cuda.get_device_properties(0).total_memory
        gpu_memory_gb = gpu_memory / (1024 ** 3)

        print(f"GPU Memory: {gpu_memory_gb:.2f} GB")

    else:

        DEVICE = "cpu"

        print("\n" + "!" * 70)
        print("WARNING: NVIDIA GPU NOT DETECTED")
        print("Training will run on CPU and will be MUCH slower.")
        print("!" * 70)

    # --------------------------------------------------------
    # Read data.yaml
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("DATASET INFORMATION")
    print("=" * 70)

    with open(DATA_YAML, "r", encoding="utf-8") as f:
        data_config = yaml.safe_load(f)

    class_names = data_config.get("names", [])

    print("\nClasses:")

    for i, name in enumerate(class_names):
        print(f"  {i}: {name}")

    print("\nNumber of classes:", len(class_names))

    # --------------------------------------------------------
    # Create YOLOv8 model FROM SCRATCH
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("CREATING YOLOv8 SMALL MODEL")
    print("=" * 70)

    # yolov8s.yaml = architecture only
    # No pretrained weights are used.

    model = YOLO("yolov8s.yaml")

    print("\nModel: YOLOv8 Small")
    print("Training: FROM SCRATCH")
    print("Pretrained weights: FALSE")

    # --------------------------------------------------------
    # Training configuration
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("TRAINING CONFIGURATION")
    print("=" * 70)

    print("\nEpochs       : 80")
    print("Image Size   : 512")
    print("Batch Size   : 16")
    print("Workers      : 4")
    print("Cache        : RAM")
    print("Optimizer    : AdamW")
    print("Deterministic: False")

    print("\n" + "=" * 70)
    print("STARTING TRAINING")
    print("=" * 70)

    # --------------------------------------------------------
    # TRAIN
    # --------------------------------------------------------

    results = model.train(

        # Dataset
        data=str(DATA_YAML),

        # Faster training
        epochs=80,
        imgsz=512,
        batch=16,
        device=DEVICE,

        # Faster data loading
        workers=4,

        # FROM SCRATCH
        pretrained=False,

        # Optimizer
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        momentum=0.937,
        weight_decay=0.0005,

        # Warmup
        warmup_epochs=3,
        warmup_momentum=0.8,
        warmup_bias_lr=0.1,

        # Augmentation
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=5,
        translate=0.1,
        scale=0.5,
        shear=2,
        perspective=0.0,
        flipud=0.0,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.1,
        copy_paste=0.0,
        close_mosaic=10,

        # Validation
        val=True,
        patience=15,

        # Save models
        save=True,
        save_period=20,

        # Generate plots
        plots=True,

        # Reproducibility
        seed=42,

        # Output
        project=str(RUNS_DIR),
        name="construction_yolov8_scratch_fast",

        # Speed
        cache=True,
        deterministic=False,

        # Logging
        verbose=True,
        show=False
    )

    # --------------------------------------------------------
    # Training finished
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("TRAINING COMPLETED!")
    print("=" * 70)

    BEST_MODEL = (
        RUNS_DIR
        / "construction_yolov8_scratch_fast"
        / "weights"
        / "best.pt"
    )

    LAST_MODEL = (
        RUNS_DIR
        / "construction_yolov8_scratch_fast"
        / "weights"
        / "last.pt"
    )

    print("\nBest model:")
    print(BEST_MODEL)

    print("\nLast model:")
    print(LAST_MODEL)

    # --------------------------------------------------------
    # Check best model
    # --------------------------------------------------------

    if not BEST_MODEL.exists():

        print("\nWARNING:")
        print("Best model file was not found.")

        return

    # --------------------------------------------------------
    # Load BEST model
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("LOADING BEST MODEL")
    print("=" * 70)

    best_model = YOLO(str(BEST_MODEL))

    print("\nLoaded:")
    print(BEST_MODEL)

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("VALIDATING BEST MODEL")
    print("=" * 70)

    metrics = best_model.val(
        data=str(DATA_YAML),
        imgsz=512,
        batch=16,
        device=DEVICE,
        workers=4,
        plots=True,
        verbose=True
    )

    # --------------------------------------------------------
    # Validation metrics
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("VALIDATION RESULTS")
    print("=" * 70)

    try:

        print(f"\nmAP50     : {metrics.box.map50:.4f}")
        print(f"mAP50-95  : {metrics.box.map:.4f}")
        print(f"Precision : {metrics.box.mp:.4f}")
        print(f"Recall    : {metrics.box.mr:.4f}")

    except Exception as e:

        print("\nCould not display validation metrics:")
        print(e)

    # --------------------------------------------------------
    # TEST DATASET
    # --------------------------------------------------------

    if "test" in data_config:

        print("\n" + "=" * 70)
        print("TEST SET EVALUATION")
        print("=" * 70)

        test_metrics = best_model.val(
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
        print("TEST RESULTS")
        print("=" * 70)

        try:

            print(
                f"\nmAP50     : "
                f"{test_metrics.box.map50:.4f}"
            )

            print(
                f"mAP50-95  : "
                f"{test_metrics.box.map:.4f}"
            )

            print(
                f"Precision : "
                f"{test_metrics.box.mp:.4f}"
            )

            print(
                f"Recall    : "
                f"{test_metrics.box.mr:.4f}"
            )

        except Exception as e:

            print("\nCould not display test metrics:")
            print(e)

    else:

        print("\nNo test dataset specified in data.yaml.")

    # --------------------------------------------------------
    # FINAL
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("MODEL READY")
    print("=" * 70)

    print("\nBEST MODEL:")
    print(BEST_MODEL)

    print("\nLAST MODEL:")
    print(LAST_MODEL)

    print("\nTraining method:")
    print("FROM SCRATCH")

    print("\nPretrained weights:")
    print("NOT USED")

    print("\nConfiguration:")
    print("YOLOv8 Small")
    print("Maximum 80 epochs")
    print("512x512 image size")
    print("Batch size 16")
    print("AdamW optimizer")
    print("RAM caching enabled")
    print("4 dataloader workers")

    print("\n" + "=" * 70)
    print("TRAINING PIPELINE FINISHED")
    print("=" * 70)


# ============================================================
# WINDOWS FIX
# ============================================================

if __name__ == "__main__":
    main()