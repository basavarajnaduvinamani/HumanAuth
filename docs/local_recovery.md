# Local recovery and optional voice check

The local scan and load probes are recorded in `bench/results/local_asset_audit.json`.

The recovered voice network is Deep4SNet, a CNN over rendered amplitude histograms.
It is not the CNN-LSTM described in the signed report. Its architecture was extracted
from the existing local source rather than designed or trained during this upgrade.
The upstream MIT attribution is preserved in `modules/local_recovered/LICENSE.voice`;
source digests and modification times are in `modules/local_recovered/provenance.json`.

The checkpoint stays at its original local path and is never committed. Enable the
additional gateway check explicitly from PowerShell:

```powershell
.venv-finish\Scripts\python.exe -m pip install -r requirements-voice-deepfake.txt
$env:HUMANAUTH_VOICE_DEEPFAKE_MODEL_PATH = Join-Path $env:USERPROFILE 'Downloads\Voice-Authentication-main\DeepfakeDetection\models\best_model.pth'
.venv-finish\Scripts\python.exe -m gateway
```

With that variable unset, the original face, document and speaker checks remain the
default. When enabled, the extra check appears in health and result cards, a failed
check rejects, and an unavailable check prevents approval. The threshold and fusion
remain uncalibrated. `bench/results/voice_deepfake_smoke.json` is a load/inference
smoke result, not an accuracy benchmark. Imports and preprocessing can add cold-start
cost. Audio filtering, histogram drawing and inference use memory; uploaded audio
and rendered histograms are not saved.

The original local steganography helper is retained unchanged for research reference
in `modules/local_recovered/steganography.py`. It is not cryptographic protection,
not a GAN, and is not called by the gateway. Its original decoding has no message
length framing. Do not treat its presence as a deployed security feature.

The FaceNet load probe failed; its exact exception is recorded in
`bench/results/local_asset_audit.json`. No replacement model was downloaded and no
new face-matching accuracy is claimed. The legacy local web app saves encrypted
uploads and conflicts with the gateway's privacy behavior. That file was stopped and
left in its original folder. The separate local GMM-UBM enrollment convention was
also left intact instead of being mixed with the bundled speaker adapter.

Source-disjoint document evaluation was skipped for the reasons and aggregate
counts in `bench/results/document_split_eligibility.json`. No new held-out accuracy
has been added.
