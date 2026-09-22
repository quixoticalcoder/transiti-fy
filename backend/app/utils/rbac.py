"""
app/utils/rbac.py
--------------------
Role-Based Access Control helpers.

Two levels of enforcement are provided:

1. `roles_required(*roles)` - a simple decorator for routes that should
   only be reachable by specific roles (e.g. only "fleet_manager" can
   edit Settings).

2. `check_module_permission(role, module, minimum_level)` - looks up the
   dynamic RolePermission matrix (managed from the Settings page) to
   decide whether a role can view/edit a given module. Because this
   reads from the DB at request time, permission changes made in
   Settings take effect immediately without redeploying code.
"""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt

_LEVEL_RANK = {"No Access": 0, "View Only": 1, "Full Access": 2}


def roles_required(*allowed_roles):
    """Decorator: only allow the request through if the JWT's role claim
    is one of `allowed_roles`. Must be combined with @jwt_required() or
    used standalone (it calls verify_jwt_in_request() itself)."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            if role not in allowed_roles:
                return jsonify({"message": "Insufficient permissions for this action."}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def check_module_permission(role: str, module: str, minimum_level: str = "View Only") -> bool:
    """
    Check the RolePermission table to see if `role` has at least
    `minimum_level` access to `module`. Returns True/False.
    Import is deferred to avoid circular imports at module load time.
    """
    from app.models.role_permission import RolePermission

    permission = RolePermission.query.filter_by(role=role, module=module).first()
    if not permission:
        # No explicit rule -> default deny, to fail safe
        return False

    return _LEVEL_RANK.get(permission.access_level, 0) >= _LEVEL_RANK.get(minimum_level, 1)


def module_permission_required(module: str, minimum_level: str = "View Only"):
    """Decorator variant of check_module_permission, for use directly on routes."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            if not check_module_permission(role, module, minimum_level):
                return jsonify({"message": f"Your role does not have {minimum_level} access to {module}."}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
