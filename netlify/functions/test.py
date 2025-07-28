import json

def handler(event, context):
    """Simple test function"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps({
            'message': 'Netlify Functions is working!',
            'word': event.get('body', '{}'),
            'method': event.get('httpMethod', 'GET')
        })
    } 