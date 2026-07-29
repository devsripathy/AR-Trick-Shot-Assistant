import torch
import torch.nn as nn

class TrickShotCoachingNet(nn.Module):
    """
    On-device compatible neural network that performs real-time trajectory outcome 
    classification and corrections estimation based on physical camera states.
    Can be exported easily to TorchScript/ONNX.
    """
    def __init__(self, input_dim=12, hidden_dim=64):
        super(TrickShotCoachingNet, self).__init__()
        
        # Core deep regression block
        self.feature_extractor = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1),
            
            nn.Linear(hidden_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.1)
        )
        
        # Head 1: Predict Success Probability (0.0 to 1.0)
        self.probability_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )
        
        # Head 2: Predict Velocity Correction Vector (Vx, Vy, Vz offset to target)
        self.correction_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 3)
        )

    def forward(self, x):
        features = self.feature_extractor(x)
        prob = self.probability_head(features)
        corr = self.correction_head(features)
        
        # Concatenate outputs: [probability, correction_x, correction_y, correction_z]
        return torch.cat([prob, corr], dim=-1)


if __name__ == "__main__":
    model = TrickShotCoachingNet()
    test_input = torch.randn(2, 12)
    test_output = model(test_input)
    print("Network Input Shape:", test_input.shape)
    print("Network Output Shape:", test_output.shape) # Expected (2, 4)
