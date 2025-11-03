from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
import os
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configuration
SELENIUM_URL = os.environ.get('SELENIUM_URL', 'http://localhost:4444')
VNC_URL = os.environ.get('VNC_URL', 'http://localhost:7900')

# Global browser state
driver = None
browser_state = {
    'url': '',
    'title': '',
    'is_running': False
}

def get_driver():
    """Get or create Selenium WebDriver with retry logic"""
    global driver
    
    # Check if existing driver is still alive
    if driver is not None:
        try:
            driver.current_url  # Test if driver is still responsive
            print("✓ Reusing existing browser session")
            return driver
        except Exception as e:
            print(f"⚠ Existing driver is dead: {e}")
            driver = None
    
    # Create new driver with retry logic
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            print(f"🔄 Connecting to Selenium (attempt {attempt + 1}/{max_retries})...")
            options = webdriver.ChromeOptions()
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
            options.set_capability('timeouts', {
                'implicit': 30000,
                'pageLoad': 60000,
                'script': 30000
            })
            
            driver = webdriver.Remote(
                command_executor=SELENIUM_URL,
                options=options
            )
            print("✅ Browser session created successfully")
            return driver
            
        except Exception as e:
            print(f"❌ Connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                print(f"⏳ Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                print("❌ All connection attempts failed")
                raise Exception(f"Failed to connect to Selenium after {max_retries} attempts: {e}")
    
    return driver

@app.route('/api/execute-step', methods=['POST'])
def execute_step():
    try:
        step_data = request.get_json()
        
        if not step_data:
            return jsonify({'error': 'No step data provided'}), 400
        
        result = execute_step_with_selenium(step_data)
        
        socketio.emit('step_executed', {
            'step': step_data,
            'result': result,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            'success': True,
            'result': result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/execute-workflow', methods=['POST'])
def execute_workflow():
    try:
        workflow_data = request.get_json()
        steps = workflow_data.get('steps', [])
        
        if not steps:
            return jsonify({'error': 'No steps provided'}), 400
        
        results = []
        
        for step in steps:
            result = execute_step_with_selenium(step)
            results.append({
                'step_id': step.get('id'),
                'result': result,
                'timestamp': datetime.now().isoformat()
            })
            
            socketio.emit('workflow_progress', {
                'step': step,
                'result': result,
                'completed': len(results),
                'total': len(steps),
                'timestamp': datetime.now().isoformat()
            })
        
        return jsonify({
            'success': True,
            'results': results,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/browser', methods=['POST'])
def browser_control():
    try:
        data = request.get_json()
        command = data.get('command')
        command_data = data.get('data', {})
        
        result = execute_browser_command(command, command_data)
        
        socketio.emit('browser_update', {
            'type': command,
            'data': result,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            'success': True,
            'result': result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    global driver
    
    # Test Selenium connection
    selenium_connected = False
    try:
        import requests
        response = requests.get(f"{SELENIUM_URL}/status", timeout=3)
        if response.status_code == 200:
            selenium_connected = True
    except:
        selenium_connected = False
    
    # Test if driver is alive
    driver_alive = False
    if driver is not None:
        try:
            driver.current_url
            driver_alive = True
        except:
            driver_alive = False
    
    return jsonify({
        'status': 'healthy' if selenium_connected else 'degraded',
        'selenium_url': SELENIUM_URL,
        'vnc_url': VNC_URL,
        'selenium_connected': selenium_connected,
        'browser_active': driver is not None,
        'driver_alive': driver_alive,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/browser-stream-info', methods=['GET'])
def get_browser_stream_info():
    """Get live browser stream information"""
    return jsonify({
        'streamUrl': VNC_URL,  # noVNC URL for live viewing
        'streamType': 'vnc',
        'connected': True,
        'interactive': True,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/browser-state', methods=['GET'])
def get_browser_state():
    """Get current browser state"""
    global browser_state, driver
    
    if driver:
        try:
            browser_state['url'] = driver.current_url
            browser_state['title'] = driver.title
        except:
            pass
    
    return jsonify({
        'url': browser_state.get('url', ''),
        'title': browser_state.get('title', ''),
        'is_running': browser_state.get('is_running', False),
        'timestamp': datetime.now().isoformat()
    })

def execute_step_with_selenium(step):
    """Execute a single step using Selenium"""
    global browser_state, driver
    
    try:
        step_type = step.get('type')
        config = step.get('config', {})
        
        browser = get_driver()
        browser_state['is_running'] = True
        
        if step_type == 'navigate':
            url = config.get('url', '')
            if not url.startswith('http'):
                url = 'https://' + url
            
            print(f"🌐 Navigating to: {url}")
            browser.get(url)
            browser_state['url'] = url
            browser_state['title'] = browser.title
            print(f"✅ Navigation successful: {browser.title}")
            
            return {
                'success': True,
                'url': url,
                'title': browser.title
            }
        
        elif step_type == 'click':
            xpath = config.get('xpath', '')
            print(f"🖱️  Attempting to click: {xpath}")
            element = WebDriverWait(browser, 10).until(
                EC.element_to_be_clickable((By.XPATH, xpath))
            )
            element.click()
            time.sleep(0.5)  # Brief wait for page update
            print(f"✅ Click successful")
            
            return {'success': True, 'message': f'Clicked element: {xpath}'}
        
        elif step_type == 'type':
            xpath = config.get('xpath', '')
            text = config.get('text', '')
            
            print(f"⌨️  Typing into: {xpath}")
            element = WebDriverWait(browser, 10).until(
                EC.presence_of_element_located((By.XPATH, xpath))
            )
            element.clear()
            element.send_keys(text)
            time.sleep(0.5)
            print(f"✅ Type successful")
            
            return {'success': True, 'message': f'Typed text into: {xpath}'}
        
        elif step_type == 'wait':
            raw_duration = config.get('duration', 1000)
            try:
                duration = float(raw_duration)
            except Exception:
                duration = 1  # default fallback
            print(f"⏳ Waiting for {duration} seconds...")
            time.sleep(duration)
            print("✅ Wait complete")
            return {'success': True, 'message': f'Waited for {duration} seconds'}
        
        elif step_type == 'screenshot':
            print(f"📸 Taking screenshot...")
            screenshot = browser.get_screenshot_as_base64()
            print(f"✅ Screenshot captured")
            return {
                'success': True,
                'screenshot': f'data:image/png;base64,{screenshot}'
            }
        
        else:
            error_msg = f'Unknown step type: {step_type}'
            print(f"❌ {error_msg}")
            return {'success': False, 'error': error_msg}
            
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Step execution failed: {error_msg}")
        browser_state['is_running'] = False
        
        # Check if it's a critical driver error (connection lost)
        if 'invalid session id' in error_msg.lower() or 'Session timed out' in error_msg:
            print("⚠️  Driver session lost, will reconnect on next step")
            driver = None
        
        return {'success': False, 'error': error_msg}

def execute_browser_command(command, data):
    """Execute browser commands"""
    global browser_state, driver
    
    try:
        if command == 'reset':
            print("🔄 Resetting browser...")
            if driver:
                try:
                    driver.quit()
                    print("✅ Browser session closed")
                except Exception as e:
                    print(f"⚠️  Error closing driver: {e}")
                finally:
                    driver = None
            
            browser_state = {
                'url': '',
                'title': '',
                'is_running': False
            }
            print("✅ Browser state reset")
            return {'success': True, 'message': 'Browser reset successfully'}
        
        elif command == 'stop':
            print("⏹️  Stopping browser execution...")
            browser_state['is_running'] = False
            return {'success': True, 'message': 'Browser stopped'}
        
        else:
            return {'success': False, 'error': f'Unknown command: {command}'}
            
    except Exception as e:
        print(f"❌ Browser command failed: {e}")
        return {'success': False, 'error': str(e)}

if __name__ == '__main__':
    print("=" * 60)
    print("Starting Live Browser Backend (Selenium + VNC)")
    print("=" * 60)
    print(f"Selenium URL: {SELENIUM_URL}")
    print(f"Live Browser View: {VNC_URL}")
    print("=" * 60)
    print("\nAccess the live browser at:")
    print(f"  {VNC_URL}")
    print("\nPassword: secret (if required)")
    print("=" * 60)
    
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)

