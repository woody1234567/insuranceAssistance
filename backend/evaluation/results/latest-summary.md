# Gemini Intent Classification Evaluation Report
- **Model**: `gemini-3.5-flash-lite`
- **Timestamp**: 2026-10-06T01:52:33.810Z
- **Total Evaluated**: 15 cases
- **Overall Accuracy**: **100.00%**
- **Claim Type (Hospital/Accident/Surg) Accuracy**: **100.00%** (3/3)
- **Average Latency**: 1195ms
- **Multi-run Stability Consistency Rate**: **100.00%** (5/5)
## Classification Metrics
```
Intent Classification Metrics Report (Model: gemini-3.5-flash-lite)
===========================================================================
Intent                       Support    Precision    Recall     F1-Score  
---------------------------------------------------------------------------
list_user_policies           3          100.0%       100.0%     100.0%    
claim_required_documents     3          100.0%       100.0%     100.0%    
start_claim                  3          100.0%       100.0%     100.0%    
redirect_to_human            3          100.0%       100.0%     100.0%    
unknown                      3          100.0%       100.0%     100.0%    
---------------------------------------------------------------------------
Macro Average                15         100.0%       100.0%     100.0%    
Weighted Average             15         100.0%       100.0%     100.0%    
===========================================================================
Overall Accuracy: 100.0% (15/15)
Claim Type Accuracy (Hospital/Accident/Surg): 100.0% (3/3)
Average Latency: 1195ms
Multi-run Stability Consistency Rate: 100.0% (5/5)
```
## Confusion Matrix
```
Actual \ Pred      POLICIES   DOCUMENTS   START_CLM       HUMAN     UNKNOWN
---------------------------------------------------------------------------
POLICIES                  3           0           0           0           0
DOCUMENTS                 0           3           0           0           0
START_CLM                 0           0           3           0           0
HUMAN                     0           0           0           3           0
UNKNOWN                   0           0           0           0           3
```
## Misclassified Cases (Bad Cases: 0)
🎉 No misclassified cases! All predictions matched ground truth.