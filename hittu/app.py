m=[
    {
        'uname': 'dhina',
        'medications': 'aspirin',
        'dosage': 500,
        'frequency': ['13:00:00']
    },
    {
        'uname': 'dhina',
        'medications': 'paracetamol',
        'dosage': 500,
        'frequency': ['13:00:00']
    }
]
for medicine in m:

    print("Medicine :", medicine["medications"])
    print("Dosage :", medicine["dosage"])
    print("Reminder :", medicine["frequency"])

    print("----------------------")
medicine_names = []
for medicine in m:

    medicine_names.append(medicine["medications"])
for i in range(len(medicine_names)):

    for j in range(i + 1, len(medicine_names)):

        print(medicine_names[i], "<--->", medicine_names[j])
import pandas as pd

df = pd.read_csv("interaction_db.csv")

print(df)
for i in m:
    print(i)
