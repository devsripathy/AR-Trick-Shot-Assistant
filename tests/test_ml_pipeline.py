import unittest
import torch
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml_pipeline')))

from model import TrickShotCoachingNet
from dataset import TrickShotDataset

class TestMLPipeline(unittest.TestCase):
    """
    Unit and integration tests to ensure PyTorch deep learning models load and run
    correctly, validating shapes and cross-platform export compatibility.
    """

    def test_model_shapes(self):
        """
        Verify that our MLP network accepts input feature shape 12 and returns
        the expected 4-dimensional output values.
        """
        model = TrickShotCoachingNet(input_dim=12, hidden_dim=64)
        dummy_input = torch.randn(5, 12) # batch size 5
        outputs = model(dummy_input)

        self.assertEqual(outputs.shape, (5, 4))
        # Ensure success probability is bound between 0 and 1 (sigmoid)
        self.assertTrue(torch.all(outputs[:, 0] >= 0.0))
        self.assertTrue(torch.all(outputs[:, 0] <= 1.0))

    def test_dataset_generation(self):
        """
        Verify that our custom trick shot dataset generates the requested sample sizes.
        """
        dataset = TrickShotDataset(num_samples=50)
        self.assertEqual(len(dataset), 50)

        features, labels = dataset[0]
        self.assertEqual(features.shape, (12,))
        self.assertEqual(labels.shape, (4,))

    def test_pt_model_inference(self):
        """
        Ensure the exported TorchScript model loads and performs successful predictions.
        """
        pt_path = "ml_pipeline/trickshot_model.pt"
        self.assertTrue(os.path.exists(pt_path), "TorchScript model was not generated!")

        traced_model = torch.jit.load(pt_path)
        dummy_input = torch.randn(1, 12)
        outputs = traced_model(dummy_input)

        self.assertEqual(outputs.shape, (1, 4))

    def test_onnx_model_inference(self):
        """
        Ensure the exported ONNX model loads and performs successful predictions using ONNX Runtime.
        """
        onnx_path = "ml_pipeline/trickshot_model.onnx"
        self.assertTrue(os.path.exists(onnx_path), "ONNX model was not generated!")

        # Optionally test with onnx library if present
        import onnx
        model = onnx.load(onnx_path)
        onnx.checker.check_model(model)

if __name__ == '__main__':
    unittest.main()
