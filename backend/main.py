from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import auth, categories, tasks

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TodoFlow API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(categories.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "TodoFlow API is running"}
