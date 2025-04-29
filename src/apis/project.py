from flask import blueprints, request, jsonify, send_file, make_response
from werkzeug.utils import secure_filename
from src.logger import Logger, route_logger
from src.config import Config
from src.project import ProjectManager
from ..state import AgentState

import os

project_bp = blueprints.Blueprint("project", __name__)

logger = Logger()
manager = ProjectManager()


# Project APIs

@project_bp.route("/api/get-project-files", methods=["GET"])
@route_logger(logger)
def project_files():
    """Get the list of files for a specified project.
    
    This function retrieves the files associated with a given project name. It extracts the project name from the request
    arguments, fetches the files using the manager, and returns them in JSON format.
    
    Args:
        project_name (str): The name of the project to retrieve files for.
    
    Returns:
        dict: A dictionary containing the list of files under the key "files".
    """
    project_name = secure_filename(request.args.get("project_name"))
    files = manager.get_project_files(project_name)  
    return jsonify({"files": files})

@project_bp.route("/api/create-project", methods=["POST"])
@route_logger(logger)
def create_project():
    """Create a new project.
    
    This function handles the creation of a new project by extracting the project name from the JSON data in the request,
    securing the filename, and then using the `manager.create_project` method to create the project.
    
    Returns:
        dict: A JSON response containing a success message.
    """
    data = request.json
    project_name = data.get("project_name")
    manager.create_project(secure_filename(project_name))
    return jsonify({"message": "Project created"})


@project_bp.route("/api/delete-project", methods=["POST"])
@route_logger(logger)
def delete_project():
    """Delete a project by its name.
    
    This function handles the deletion of a project, including removing it from the manager and clearing its state. It
    expects a JSON payload containing the project name. If the project is successfully deleted, it returns a success
    message.
    
    Returns:
        dict: A JSON response with a "message" key indicating the project has been deleted.
    """
    data = request.json
    project_name = secure_filename(data.get("project_name"))
    manager.delete_project(project_name)
    AgentState().delete_state(project_name)
    return jsonify({"message": "Project deleted"})


@project_bp.route("/api/download-project", methods=["GET"])
@route_logger(logger)
def download_project():
    """Download a project zip file.
    
    This function retrieves the project name from the request arguments, converts it to a secure filename, and then uses the
    manager to create a zip file of the project. The function then returns the zip file as an attachment.
    
    Args:
        project_name (str): The name of the project to be downloaded, provided as a query parameter.
    
    Returns:
        Response: A Flask response object containing the project zip file.
    """
    project_name = secure_filename(request.args.get("project_name"))
    manager.project_to_zip(project_name)
    project_path = manager.get_zip_path(project_name)
    return send_file(project_path, as_attachment=False)


@project_bp.route("/api/download-project-pdf", methods=["GET"])
@route_logger(logger)
def download_project_pdf():
    """Download a project PDF file.
    
    This function retrieves a project name from query parameters, constructs the path to the corresponding PDF file, and
    sends it as a response. If the PDF file does not exist or an error occurs during file handling, appropriate HTTP
    responses will be returned.
    
    Returns:
        Response: A Flask response object containing the PDF file.
    """
    project_name = secure_filename(request.args.get("project_name"))
    pdf_dir = Config().get_pdfs_dir()
    pdf_path = os.path.join(pdf_dir, f"{project_name}.pdf")

    response = make_response(send_file(pdf_path))
    response.headers['Content-Type'] = 'project_bplication/pdf'
    return response
