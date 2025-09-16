import numpy as np

def compute_distance(emb1, emb2):
    """Euclidean distance between two embeddings."""
    return np.linalg.norm(emb1 - emb2)