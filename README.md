1. **Clone the repository**
   ```bash
   git clone https://github.com/Sohampatel24/SIH-HACKATHON-2025
   cd Project
   ```
   Project/
├── backend-node/
│   ├── models/
│   │   ├── Student.js
│   │   └── Attendance.js
│   ├── routes/
│   │   ├── students.js
│   │   └── video.js
│   ├── views/
│   │   ├── layout.ejs
│   │   ├── upload.ejs
│   │   ├── results.ejs
│   │   └── dashboard.ejs
│   ├── public/
│   │   └── css/
│   │       └── style.css
│   ├── package.json
│   └── server.js
│
├── ml-service-python/
│   ├── enroll_api.py
│   ├── video_recognize_api.py
│   ├── enroll.py          # (your existing enroll.py; keep here)
│   ├── recognize.py       # (modified; see below)
│   ├── utils.py           # (keep your compute_distance)
│   ├── config.yaml
│   ├── models/            # dlib .dat files (unchanged)
│   ├── images/            # enroll images
│   ├── embeddings/        # .npy embeddings
│   ├── model.pkl          # created by enroll_api when embeddings exist
│   └── requirements.txt
│
├── README.md
└── ...
Make a seperate python environment in 'ml-service-python' folder
Open 3 seperate cmd 

pip install -r requirements.txt
  
1) cd backend-node
2) 1st cmd run - "npm init -y"
3) 1st cmd run - "npm install express ejs body-parser mongoose multer axios form-data"
4) 1st cmd run - "npm install express-ejs-layouts"
5) 1st cmd run - "node server.js"
6) 2nd cmd - cd ml-service-python
               activate virtual environment
               .venv\Scripts\activate
7) 2nd cmd run - "python enroll_api.py"

8) 3rd cmd run - cd ml-service-python
                  activate virtual environment
                  .venv\Scripts\activate 
 9) 3rd cmd run - "python video_recognize_api.py"

Now open server one by one. 



