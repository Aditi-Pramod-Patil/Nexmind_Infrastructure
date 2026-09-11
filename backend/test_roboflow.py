import sys
import json
from inference_sdk import InferenceHTTPClient, InferenceConfiguration

def main():
    image_path = sys.argv[1] if len(sys.argv) > 1 else "sample.jpg"
    print(f"Connecting to Roboflow Inference Serverless API...")
    
    # 1. Connect to your workflow
    client = InferenceHTTPClient(
        api_url="https://serverless.roboflow.com",
        api_key="ihcK74KhpxtPIwfsGMvK"
    ).configure(InferenceConfiguration(
        api_key_transport="header"  # header-based auth (inference v1.5.0+)
    ))

    print(f"Running workflow for image: {image_path}")
    
    # 2. Run your workflow on an image
    try:
        result = client.run_workflow(
            workspace_name="aditi-patil-8ubn1",
            workflow_id="construction-progress-monitoring-vconstruction-progress-monitoring-ibhzf-1-yolo26n-seg-t1-logic",
            images={
                "image": image_path
            },
            use_cache=True
        )
        print("\n--- Workflow Execution Result ---")
        print(json.dumps(result, indent=2, default=str))
    except Exception as e:
        print(f"\nExecution error: {e}")

if __name__ == "__main__":
    main()
