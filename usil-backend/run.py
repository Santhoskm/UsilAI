import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",     # Binds to all interfaces (192.168.1.8 + localhost)
        port=8000,
        reload=True
    )