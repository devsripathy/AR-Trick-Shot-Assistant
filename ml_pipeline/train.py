import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split

from dataset import TrickShotDataset
from model import TrickShotCoachingNet

def train_pipeline(epochs=15, batch_size=32, num_samples=1500):
    print("=== Starting AR Trick Shot AI Training Pipeline ===")

    # 1. Initialize dataset
    print(f"Generating synthetic physical data ({num_samples} samples)...")
    dataset = TrickShotDataset(num_samples=num_samples)

    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    # 2. Build model, optimizer, and loss functions
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using compute device: {device}")

    
    # 1. Initialize dataset
    print(f"Generating synthetic physical data ({num_samples} samples)...")
    dataset = TrickShotDataset(num_samples=num_samples)
    
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    
    # 2. Build model, optimizer, and loss functions
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using compute device: {device}")
    
    model = TrickShotCoachingNet(input_dim=12, hidden_dim=64).to(device)
    optimizer = optim.Adam(model.parameters(), lr=0.005, weight_decay=1e-4)
    criterion_prob = nn.BCELoss() # For probability [0, 1]
    criterion_corr = nn.MSELoss() # For trajectory adjustment values

    
    # 3. Training Loop
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0

        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)

            # Loss formulation
            loss_prob = criterion_prob(outputs[:, 0], targets[:, 0])
            loss_corr = criterion_corr(outputs[:, 1:], targets[:, 1:])

            # Weighted loss combination (probability takes precedence, then path alignment)
            loss = loss_prob * 2.0 + loss_corr

            loss.backward()
            optimizer.step()

            running_loss += loss.item() * inputs.size(0)

        epoch_loss = running_loss / len(train_dataset)

        
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            
            # Loss formulation
            loss_prob = criterion_prob(outputs[:, 0], targets[:, 0])
            loss_corr = criterion_corr(outputs[:, 1:], targets[:, 1:])
            
            # Weighted loss combination (probability takes precedence, then path alignment)
            loss = loss_prob * 2.0 + loss_corr
            
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            
        epoch_loss = running_loss / len(train_dataset)
        
        # Validation epoch assessment
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for val_inputs, val_targets in val_loader:
                val_inputs, val_targets = val_inputs.to(device), val_targets.to(device)
                val_outputs = model(val_inputs)

                loss_prob = criterion_prob(val_outputs[:, 0], val_targets[:, 0])
                loss_corr = criterion_corr(val_outputs[:, 1:], val_targets[:, 1:])
                val_loss += (loss_prob * 2.0 + loss_corr).item() * val_inputs.size(0)

        val_epoch_loss = val_loss / len(val_dataset)
        print(f"Epoch {epoch+1:02d}/{epochs:02d} | Train Loss: {epoch_loss:.4f} | Val Loss: {val_epoch_loss:.4f}")

    print("Training phase successfully completed.")

    # 4. Exporting models for mobile/on-device runtimes
    model.eval()
    print("Exporting model to multi-platform formats...")

    # Dummy input for trace
    dummy_input = torch.randn(1, 12).to(device)

                
                loss_prob = criterion_prob(val_outputs[:, 0], val_targets[:, 0])
                loss_corr = criterion_corr(val_outputs[:, 1:], val_targets[:, 1:])
                val_loss += (loss_prob * 2.0 + loss_corr).item() * val_inputs.size(0)
                
        val_epoch_loss = val_loss / len(val_dataset)
        print(f"Epoch {epoch+1:02d}/{epochs:02d} | Train Loss: {epoch_loss:.4f} | Val Loss: {val_epoch_loss:.4f}")
        
    print("Training phase successfully completed.")
    
    # 4. Exporting models for mobile/on-device runtimes
    model.eval()
    print("Exporting model to multi-platform formats...")
    
    # Dummy input for trace
    dummy_input = torch.randn(1, 12).to(device)
    
    # Export to TorchScript
    try:
        traced_cell = torch.jit.trace(model, dummy_input)
        pt_path = "ml_pipeline/trickshot_model.pt"
        traced_cell.save(pt_path)
        print(f"-> Successfully saved TorchScript trace: '{pt_path}'")
    except Exception as e:
        print("Failed to save TorchScript trace:", e)

        
    # Export to ONNX (for Unity Barracuda/Sentis or Android NNAPI)
    try:
        import onnx
        onnx_path = "ml_pipeline/trickshot_model.onnx"
        torch.onnx.export(
            model,
            dummy_input,
            onnx_path,
            export_params=True,
            opset_version=18,
            do_constant_folding=True,
            input_names=['state_input'],
            output_names=['coaching_outputs']
        )
        print(f"-> Successfully exported ONNX model: '{onnx_path}'")
    except Exception as e:
        print("Failed to export ONNX model:", e)

if __name__ == "__main__":
    train_pipeline(epochs=10, batch_size=32, num_samples=1000)
