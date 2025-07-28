import json

def handler(event, context):
    """Simplified spaCy lemmatization function"""
    try:
        # Parse request
        if event.get('httpMethod') == 'POST':
            try:
                body = json.loads(event.get('body', '{}'))
                word = body.get('word', '').strip()
            except json.JSONDecodeError:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Invalid JSON'})
                }
            
            if not word:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Word is required'})
                }
            
            # For now, return a simple response to test connectivity
            result = {
                "original": word,
                "lemma": word,  # Placeholder
                "pos": "UNKNOWN",
                "success": True,
                "message": "Function connected successfully"
            }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': json.dumps(result)
            }
        else:
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Method not allowed. Use POST.'})
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Function error: {str(e)}'})
        } 