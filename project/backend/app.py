from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
from config import Config
from extensions import db, jwt
import os


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)

    # 🔥 CORS (simple + permissive for local dev)
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        allow_headers=["Authorization", "Content-Type"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

 
    @app.route("/api/<path:any_path>", methods=["OPTIONS"])
    def handle_api_options(any_path):
        return jsonify({}), 200

    # ---------- Blueprints ----------
    from routes.auth import auth_bp
    from routes.pass_routes import pass_bp
    from routes.admin_routes import admin_bp
    from routes.renewal_routes import renewal_bp
    from routes.payment_routes import payment_bp
    from routes.status_route import status_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(pass_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(renewal_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(status_bp)

    return app


app = create_app()


# ---------- Static files ----------


@app.route("/uploads/id_proofs/<filename>")
def view_id_proof(filename):
    upload_dir = r"C:\Users\subha\Desktop\Bus_pass\project\backend\uploads\id_proofs"

    print("UPLOAD DIR EXISTS:", os.path.exists(upload_dir))
    print("REQUESTED FILE:", filename)
    print("FULL PATH:", os.path.join(upload_dir, filename))
    print("FILE EXISTS:", os.path.exists(os.path.join(upload_dir, filename)))
    print("FILES IN DIR:", os.listdir(upload_dir))

    if not os.path.exists(os.path.join(upload_dir, filename)):
        abort(404)

    return send_from_directory(upload_dir, filename)
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True, use_reloader=True)
