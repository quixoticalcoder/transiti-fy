"""
app/routes/auth.py
---------------------
Authentication blueprint - email + password login, issuing JWT access
and refresh tokens. RBAC role is embedded in the token's additional
claims so the frontend (and @jwt_required()-protected routes) can read
it without an extra DB call.

Account provisioning model
---------------------------
There is no public self-signup. Accounts are created by an existing
Fleet Manager (the admin role in this app) from Settings > User
Management, which calls POST /register while authenticated. This
mirrors how the RBAC matrix itself is admin-managed: the *creator*
decides a new user's role, the new user never gets to pick it.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models.user import User
from app.models.role_permission import ROLES
from app.utils.rbac import roles_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

MAX_FAILED_ATTEMPTS = 5
ADMIN_ROLE = "fleet_manager"


@auth_bp.route("/register", methods=["POST"])
@roles_required(ADMIN_ROLE)
def register():
    """
    Create a new user account. Fleet-Manager-only: this is how every
    account in the system gets provisioned (no public signup route
    exists). The caller picks the new user's role; the new user cannot
    self-assign one.
    """
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "dispatcher")

    if not all([name, email, password]):
        return jsonify({"message": "name, email and password are required"}), 400

    if role not in ROLES:
        return jsonify({"message": f"Invalid role: {role}"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 409

    user = User(name=name, email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User created", "user": user.to_dict()}), 201


@auth_bp.route("/users", methods=["GET"])
@roles_required(ADMIN_ROLE)
def list_users():
    """Fleet-Manager-only: list every provisioned account, for the
    Settings > User Management panel."""
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200


@auth_bp.route("/users/<int:user_id>", methods=["PATCH"])
@roles_required(ADMIN_ROLE)
def update_user(user_id):
    """Fleet-Manager-only: change a user's role or active/locked state.
    A Fleet Manager cannot demote or deactivate their own account, to
    avoid an admin accidentally locking themselves out."""
    data = request.get_json() or {}
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    requester_id = get_jwt_identity()
    if str(user.id) == str(requester_id) and (
        "role" in data or data.get("is_active") is False
    ):
        return jsonify({"message": "You cannot change your own role or deactivate your own account."}), 400

    if "role" in data:
        if data["role"] not in ROLES:
            return jsonify({"message": f"Invalid role: {data['role']}"}), 400
        user.role = data["role"]

    if "is_active" in data:
        user.is_active = bool(data["is_active"])
        if user.is_active:
            user.is_locked = False
            user.failed_login_attempts = 0

    db.session.commit()
    return jsonify({"message": "User updated", "user": user.to_dict()}), 200


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate a user and issue access + refresh JWT tokens."""
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "Invalid credentials."}), 401

    if not user.is_active:
        return jsonify({"message": "This account has been deactivated."}), 403

    if user.is_locked:
        return jsonify({"message": "Account locked after 5 failed attempts."}), 403

    if not user.check_password(password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.is_locked = True
        db.session.commit()
        return jsonify({"message": "Invalid credentials."}), 401

    # Successful login - reset failed attempt counter
    user.failed_login_attempts = 0
    db.session.commit()

    additional_claims = {"role": user.role, "name": user.name}
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(),
    }), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Issue a new access token from a valid refresh token."""
    identity = get_jwt_identity()
    claims = get_jwt()
    new_access_token = create_access_token(
        identity=identity,
        additional_claims={"role": claims.get("role"), "name": claims.get("name")},
    )
    return jsonify({"access_token": new_access_token}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """Return the currently authenticated user's profile."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200
