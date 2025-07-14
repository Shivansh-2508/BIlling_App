import os
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv

# Load env variables
load_dotenv()

cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)

firestore_db = firestore.client()

def get_user_mongo_uri(user_id):
    """
    Fetch the MongoDB URI for a user from Firestore.
    Assumes a collection 'user_mongo_uris' with doc id = user_id and field 'mongo_uri'.
    """
    doc_ref = firestore_db.collection('user_mongo_uris').document(user_id)
    doc = doc_ref.get()
    if doc.exists:
        return doc.to_dict().get('mongo_uri')
    return None

def verify_firebase_token(id_token):
    """
    Verifies the Firebase ID token and returns the decoded token (user info).
    Raises firebase_admin.auth.InvalidIdTokenError if invalid.
    """
    decoded_token = auth.verify_id_token(id_token)
    return decoded_token
