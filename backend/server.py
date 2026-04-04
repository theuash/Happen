from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import secrets

ROOT_DIR = Path(__file__).parent

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# Password Hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT Token Management
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Auth Helper
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Pydantic Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "employee"

class UserResponse(BaseModel):
    id: str = Field(alias="_id")
    email: str
    name: str
    role: str
    team_id: Optional[str] = None
    department: Optional[str] = None

    class Config:
        populate_by_name = True

# Auth Endpoints
@api_router.post("/auth/login")
async def login(request: LoginRequest, response: Response):
    email = request.email.lower()
    user = await db.users.find_one({"email": email})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, user["email"])
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/"
    )
    
    return {
        "_id": user_id,
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "team_id": user.get("team_id"),
        "department": user.get("department"),
        "token": access_token
    }

@api_router.post("/auth/register")
async def register(request: RegisterRequest, response: Response):
    email = request.email.lower()
    existing = await db.users.find_one({"email": email})
    
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(request.password)
    new_user = {
        "email": email,
        "password_hash": hashed,
        "name": request.name,
        "role": request.role,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.users.insert_one(new_user)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=900,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800,
        path="/"
    )
    
    return {
        "_id": user_id,
        "email": email,
        "name": request.name,
        "role": request.role,
        "token": access_token
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

# User Endpoints
@api_router.get("/me/leave-balance")
async def get_leave_balance(user: dict = Depends(get_current_user)):
    return {
        "annual": {"used": 8, "total": 20, "remaining": 12},
        "sick": {"used": 3, "total": 10, "remaining": 7},
        "wellness": {"used": 1, "total": 2, "remaining": 1},
        "emergency": {"used": 1, "total": 3, "remaining": 2}
    }

@api_router.get("/me/leave-requests")
async def get_my_leave_requests(user: dict = Depends(get_current_user)):
    return [
        {
            "id": "1",
            "type": "annual",
            "start_date": "2026-02-15",
            "end_date": "2026-02-20",
            "days": 5,
            "status": "pending",
            "requested_at": "2026-01-25T10:00:00Z"
        },
        {
            "id": "2",
            "type": "sick",
            "start_date": "2026-01-10",
            "end_date": "2026-01-11",
            "days": 2,
            "status": "approved",
            "requested_at": "2026-01-09T08:00:00Z"
        }
    ]

@api_router.get("/me/queue-position")
async def get_queue_position(user: dict = Depends(get_current_user)):
    return {
        "position": 3,
        "total": 12,
        "estimated_approval": "2026-02-05"
    }

@api_router.get("/me/activity")
async def get_my_activity(user: dict = Depends(get_current_user)):
    return [
        {"type": "leave_requested", "description": "Requested 5 days annual leave", "timestamp": "2026-01-25T10:00:00Z"},
        {"type": "leave_approved", "description": "Sick leave approved", "timestamp": "2026-01-10T14:30:00Z"}
    ]

@api_router.get("/me/wellness-balance")
async def get_wellness_balance(user: dict = Depends(get_current_user)):
    return {"used": 1, "total": 2, "remaining": 1}

@api_router.post("/wellness/request")
async def request_wellness_day(user: dict = Depends(get_current_user)):
    return {"status": "approved", "message": "Wellness day granted!"}

@api_router.post("/leave-requests")
async def create_leave_request(request: Dict[str, Any], user: dict = Depends(get_current_user)):
    # Mock response with random status
    import random
    statuses = ["approved", "queued", "pending"]
    status = random.choice(statuses)
    
    return {
        "id": secrets.token_hex(8),
        "status": status,
        "queue_position": 5 if status == "queued" else None,
        "message": f"Leave request {status}"
    }

@api_router.get("/teams/{team_id}/workload")
async def get_team_workload(team_id: str, user: dict = Depends(get_current_user)):
    return {
        "percentage": 68,
        "trend": "+5",
        "deadlines": [
            {"title": "Q1 Report", "date": "2026-02-10"},
            {"title": "Client Presentation", "date": "2026-02-15"}
        ]
    }

@api_router.get("/teams/{team_id}/calendar")
async def get_team_calendar(team_id: str, user: dict = Depends(get_current_user)):
    return {
        "members": [
            {"id": "1", "name": "John Doe", "days": [{"date": "2026-02-05", "status": "leave"}]},
            {"id": "2", "name": "Jane Smith", "days": [{"date": "2026-02-08", "status": "leave"}]}
        ]
    }

@api_router.get("/teams/{team_id}/requests")
async def get_team_requests(team_id: str, user: dict = Depends(get_current_user)):
    return [
        {
            "id": "1",
            "employee": {"name": "John Doe", "avatar": "JD"},
            "start_date": "2026-02-15",
            "end_date": "2026-02-20",
            "days": 5,
            "type": "annual",
            "system_recommendation": "Auto-Approve",
            "priority_score": 85
        }
    ]

@api_router.get("/teams/{team_id}/queue")
async def get_team_queue(team_id: str, user: dict = Depends(get_current_user)):
    return [
        {"position": 1, "employee": "Alice Brown", "dates": "Feb 10-12", "priority_score": 92},
        {"position": 2, "employee": "Bob Wilson", "dates": "Feb 15-17", "priority_score": 88}
    ]

@api_router.get("/teams/{team_id}/analytics")
async def get_team_analytics(team_id: str, user: dict = Depends(get_current_user)):
    return {
        "workload": 68,
        "pending_requests": 5,
        "members_count": 12,
        "on_leave_today": 2
    }

@api_router.patch("/leave-requests/{request_id}/approve")
async def approve_leave(request_id: str, user: dict = Depends(get_current_user)):
    return {"message": "Leave request approved"}

@api_router.patch("/leave-requests/{request_id}/deny")
async def deny_leave(request_id: str, user: dict = Depends(get_current_user)):
    return {"message": "Leave request denied"}

@api_router.patch("/leave-requests/{request_id}/override")
async def override_decision(request_id: str, data: Dict[str, Any], user: dict = Depends(get_current_user)):
    return {"message": "Decision overridden"}

@api_router.get("/company/workload")
async def get_company_workload(user: dict = Depends(get_current_user)):
    return {"percentage": 72}

@api_router.get("/company/burnout-risk")
async def get_burnout_risk(user: dict = Depends(get_current_user)):
    return {
        "alerts": [
            {"employee": "John Doe", "days_since_leave": 180, "risk_level": "high"}
        ]
    }

@api_router.get("/company/overrides")
async def get_overrides(user: dict = Depends(get_current_user)):
    return []

@api_router.get("/hr/emergency-leaves")
async def get_emergency_leaves(user: dict = Depends(get_current_user)):
    return []

@api_router.get("/hr/bias-report")
async def get_bias_report(user: dict = Depends(get_current_user)):
    return []

@api_router.get("/hr/compliance")
async def get_compliance(user: dict = Depends(get_current_user)):
    return {"statutory_compliance": 95}

@api_router.get("/employees")
async def search_employees(search: str = "", user: dict = Depends(get_current_user)):
    return []

@api_router.get("/accounting/summary")
async def get_accounting_summary(user: dict = Depends(get_current_user)):
    return {
        "total_payroll": 250000,
        "leave_costs": 15000,
        "department_count": 8
    }

@api_router.get("/accounting/departments")
async def get_departments(user: dict = Depends(get_current_user)):
    return []

@api_router.get("/accounting/integrations")
async def get_integrations(user: dict = Depends(get_current_user)):
    return []

@api_router.get("/employees/{employee_id}/payroll")
async def get_employee_payroll(employee_id: str, user: dict = Depends(get_current_user)):
    return {}

@api_router.get("/admin/users")
async def get_all_users(user: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    for u in users:
        u["_id"] = str(u["_id"])
    return users

@api_router.get("/admin/audit-logs")
async def get_audit_logs(user: dict = Depends(get_current_user)):
    return []

@api_router.post("/admin/impersonate")
async def impersonate_user(response: Response, data: Dict[str, Any], user: dict = Depends(get_current_user)):
    target_user_id = data.get("user_id")
    target_user = await db.users.find_one({"_id": ObjectId(target_user_id)})
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    access_token = create_access_token(str(target_user["_id"]), target_user["email"])
    
    return {
        "_id": str(target_user["_id"]),
        "email": target_user["email"],
        "name": target_user["name"],
        "role": target_user["role"],
        "token": access_token,
        "impersonated": True,
        "original_user_id": user["_id"]
    }

@api_router.get("/calendar")
async def get_calendar(month: int = 2, year: int = 2026, user: dict = Depends(get_current_user)):
    return {
        "leaves": [
            {"date": "2026-02-05", "type": "approved", "user": "John Doe"},
            {"date": "2026-02-14", "type": "holiday", "name": "Valentine's Day"}
        ]
    }

@api_router.get("/donations/campaigns")
async def get_donation_campaigns(user: dict = Depends(get_current_user)):
    return []

@api_router.post("/donations")
async def donate_days(data: Dict[str, Any], user: dict = Depends(get_current_user)):
    return {"message": "Days donated successfully"}

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    return {"count": 3, "notifications": []}

# Admin password endpoint
@api_router.get("/admin/passwords")
async def get_passwords(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    # Return all user passwords (for demo only!)
    users = await db.users.find({}).to_list(1000)
    passwords = []
    for u in users:
        passwords.append({
            "user_id": str(u["_id"]),
            "email": u["email"],
            "name": u["name"],
            "role": u["role"]
        })
    return passwords

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000'), 'https://workplace-os-ui.preview.emergentagent.com'],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed Users
@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    
    # Seed users
    seed_users = [
        {
            "email": os.environ.get("ADMIN_EMAIL", "admin@happen.com"),
            "password": os.environ.get("ADMIN_PASSWORD", "admin123"),
            "name": "Admin User",
            "role": "admin",
            "team_id": "team-1",
            "department": "Management"
        },
        {
            "email": os.environ.get("EMPLOYEE_EMAIL", "employee@happen.com"),
            "password": os.environ.get("EMPLOYEE_PASSWORD", "employee123"),
            "name": "John Employee",
            "role": "employee",
            "team_id": "team-1",
            "department": "Engineering"
        },
        {
            "email": os.environ.get("TEAM_LEAD_EMAIL", "teamlead@happen.com"),
            "password": os.environ.get("TEAM_LEAD_PASSWORD", "teamlead123"),
            "name": "Sarah TeamLead",
            "role": "team_lead",
            "team_id": "team-1",
            "department": "Engineering"
        },
        {
            "email": os.environ.get("MANAGER_EMAIL", "manager@happen.com"),
            "password": os.environ.get("MANAGER_PASSWORD", "manager123"),
            "name": "Michael Manager",
            "role": "manager",
            "team_id": "team-1",
            "department": "Management"
        },
        {
            "email": os.environ.get("HR_EMAIL", "hr@happen.com"),
            "password": os.environ.get("HR_PASSWORD", "hr123"),
            "name": "Emily HR",
            "role": "hr",
            "team_id": "team-2",
            "department": "Human Resources"
        },
        {
            "email": os.environ.get("ACCOUNTING_EMAIL", "accounting@happen.com"),
            "password": os.environ.get("ACCOUNTING_PASSWORD", "accounting123"),
            "name": "David Accounting",
            "role": "accounting",
            "team_id": "team-3",
            "department": "Finance"
        }
    ]
    
    for user_data in seed_users:
        existing = await db.users.find_one({"email": user_data["email"]})
        if existing is None:
            hashed = hash_password(user_data["password"])
            await db.users.insert_one({
                "email": user_data["email"],
                "password_hash": hashed,
                "name": user_data["name"],
                "role": user_data["role"],
                "team_id": user_data.get("team_id"),
                "department": user_data.get("department"),
                "created_at": datetime.now(timezone.utc)
            })
        elif not verify_password(user_data["password"], existing["password_hash"]):
            await db.users.update_one(
                {"email": user_data["email"]},
                {"$set": {"password_hash": hash_password(user_data["password"])}}
            )
    
    # Write credentials to test file
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials for Happen\n\n")
        f.write("## Demo Users\n\n")
        for user_data in seed_users:
            f.write(f"**{user_data['role'].upper()}**\n")
            f.write(f"- Email: {user_data['email']}\n")
            f.write(f"- Password: {user_data['password']}\n")
            f.write(f"- Name: {user_data['name']}\n\n")
        f.write("## Auth Endpoints\n\n")
        f.write("- POST /api/auth/login\n")
        f.write("- POST /api/auth/register\n")
        f.write("- GET /api/auth/me\n")
        f.write("- POST /api/auth/logout\n")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
