import os, threading, re, json, time
from datetime import date, timedelta
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from pathlib import Path
ROOT=str(Path(__file__).resolve().parents[1])
os.chdir(ROOT)
MOCK='''
export const auth={currentUser:JSON.parse(sessionStorage.getItem('user')||'null'),authStateReady:async()=>{}};
export const db={};
export async function getIdTokenResult(user){if(user.fail)throw Error('token unavailable');return {claims:{admin:user.admin}};}
export function onIdTokenChanged(a,cb){return onAuthStateChanged(a,cb);}

export const initializeApp=()=>({}); export const getAuth=()=>auth; export const getFirestore=()=>db;
const save=()=>sessionStorage.setItem('user',JSON.stringify(auth.currentUser));
export async function createUserWithEmailAndPassword(a,email,p){ await new Promise(r=>setTimeout(r,100)); a.currentUser={uid:'test-user',email,admin:email==='admin@example.com'};save();return {user:a.currentUser}; }
export async function updateProfile(user,data){Object.assign(user,data);save();}
export async function signInWithEmailAndPassword(a,email,p){if(p==='badpass')throw {code:'auth/invalid-credential'};return createUserWithEmailAndPassword(a,email,p);}
export async function sendPasswordResetEmail(){}
const callbacks=[];
export function onAuthStateChanged(a,cb){callbacks.push(cb);window.authCallback=u=>callbacks.forEach(fn=>fn(u));setTimeout(()=>cb(a.currentUser),0);}
export async function signOut(a){a.currentUser=null;save();window.authCallback?.(null);}
export const collection=()=>({}); export const serverTimestamp=()=> 'server-time';
export async function addDoc(c,data){window.savedData=data;window.writes=(window.writes||0)+1;await new Promise(r=>setTimeout(r,200));if(window.failWrite)throw Error('offline');return {id:'test-booking'};}
'''
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  if self.path.startswith('/mock.js'): body=MOCK.encode();typ='text/javascript'
  elif self.path.startswith('/js/'):
   body=open(ROOT+self.path.split('?')[0]).read();body=re.sub(r'https://www.gstatic.com/firebasejs/[^/]+/firebase-[a-z]+.js','/mock.js',body);body=body.encode();typ='text/javascript'
  else:return super().do_GET()
  self.send_response(200);self.send_header('Content-Type',typ);self.end_headers();self.wfile.write(body)
server=ThreadingHTTPServer(('127.0.0.1',8765),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
options=webdriver.ChromeOptions()
if os.environ.get('CHROME_BINARY'):
 options.binary_location=os.environ['CHROME_BINARY']
for arg in ['--headless','--no-sandbox','--disable-dev-shm-usage']:options.add_argument(arg)
driver=webdriver.Chrome(service=Service(os.environ.get('CHROMEDRIVER')),options=options)
wait=WebDriverWait(driver,10)
def el(id):return driver.find_element(By.ID,id)
def fill(id,value):el(id).clear();el(id).send_keys(value)
def ready(path):wait.until(lambda d:path in d.current_url)
def message(value):wait.until(lambda d:value in el('form-message').text)
try:
 for page in ['index', 'servicios', 'nosotros', 'contacto']:
  driver.get(f'http://127.0.0.1:8765/{page}.html')
  assert driver.find_elements(By.CSS_SELECTOR, 'main h1'), page
  assert not driver.find_elements(By.CSS_SELECTOR, 'a[href="#"]'), page
  assert len(driver.find_elements(By.CSS_SELECTOR, 'nav [aria-current="page"]')) == 1
  for width in [375, 768, 1440]:
   driver.set_window_size(width,1000)
   assert driver.execute_script('return document.documentElement.scrollWidth <= innerWidth'), (page,width)
   driver.save_screenshot(f'/tmp/glamurosa-{page}-{width}.png')
 print('PASS public pages, navigation, links and responsive layouts')
 wait.until(lambda d:d.execute_script('return !!navigator.serviceWorker.controller'))
 manifest=driver.execute_async_script("fetch('/manifest.json').then(r=>r.json()).then(arguments[0])")
 for icon in manifest['icons']:
  result=driver.execute_async_script("const done=arguments[arguments.length-1];const i=new Image();i.onload=()=>done([i.naturalWidth,i.naturalHeight]);i.onerror=()=>done(null);i.src=arguments[0]", '/'+icon['src'])
  assert 'x'.join(map(str,result))==icon['sizes']
 print('PASS PWA icon dimensions')
 driver.execute_cdp_cmd('Network.enable', {})
 driver.execute_cdp_cmd('Network.emulateNetworkConditions', {'offline':True,'latency':0,'downloadThroughput':0,'uploadThroughput':0})
 driver.get('http://127.0.0.1:8765/servicios.html?offline=1')
 assert driver.find_element(By.CSS_SELECTOR,'main h1').text=='Nuestros servicios'
 driver.execute_cdp_cmd('Network.emulateNetworkConditions', {'offline':False,'latency':0,'downloadThroughput':-1,'uploadThroughput':-1})
 print('PASS offline cached navigation with query string')
 driver.get('http://127.0.0.1:8765/reserva.html');ready('login.html');print('PASS guest redirect')
 for width in [375,768,1440]:
  driver.set_window_size(width,1000);assert driver.execute_script('return document.documentElement.scrollWidth <= innerWidth');driver.save_screenshot(f'/tmp/glamurosa-login-{width}.png')
 print('PASS responsive login 375/768/1440')
 fill('login-email','test@example.com');fill('login-password','badpass');el('form-login').submit();wait.until(lambda d:'Comprueba' in el('auth-message').text);print('PASS invalid login')
 el('show-recovery').click();el('form-recovery').submit();wait.until(lambda d:'instrucciones' in el('auth-message').text);el('back-to-login').click();print('PASS recovery')
 el('tab-register').click();fill('register-name','Test Cliente');fill('register-email','test@example.com');fill('register-password','abcdef');fill('register-password-confirm','different');el('form-register').submit();assert 'no coinciden' in el('auth-message').text
 fill('register-password-confirm','abcdef');el('form-register').submit();ready('reserva.html');wait.until(lambda d:el('nombre').get_attribute('value')=='Test Cliente');print('PASS register, mismatch and profile')
 for width in [375,768,1440]:
  driver.set_window_size(width,1000);assert driver.execute_script('return document.documentElement.scrollWidth <= innerWidth');driver.save_screenshot(f'/tmp/glamurosa-reserva-{width}.png')
 print('PASS responsive booking 375/768/1440')
 fill('telefono','7000 0000');driver.execute_script("document.getElementById('servicio').value='Builder Gel';document.getElementById('fecha').value=arguments[0];document.getElementById('hora').value='08:00'", (date.today()+timedelta(days=(6-date.today().weekday())%7+7)).isoformat());el('booking-form').submit();message('lunes a sábado');print('PASS Sunday rejected')
 driver.execute_script("document.getElementById('fecha').value=arguments[0];window.failWrite=true", (date.today()+timedelta(days=(6-date.today().weekday())%7+8)).isoformat());el('booking-form').submit();message('No se pudo');assert el('telefono').get_attribute('value')=='7000 0000';print('PASS failed write preserves form')
 driver.execute_script("window.failWrite=false;window.writes=0;document.getElementById('booking-form').dispatchEvent(new Event('submit',{cancelable:true}));document.getElementById('booking-form').dispatchEvent(new Event('submit',{cancelable:true}));");message('pendiente');assert driver.execute_script('return window.writes')==1;data=driver.execute_script('return window.savedData');assert data['uid']=='test-user' and data['estado']=='pendiente' and data['hora']=='08:00';print('PASS owned pending booking and duplicate submission guard')
 el('logout').click();ready('login.html');print('PASS logout')
 fill('login-email','admin@example.com');fill('login-password','abcdef');el('form-login').submit();ready('admin.html')
 wait.until(lambda d:el('admin-dashboard').is_displayed())
 for page in ['index','nosotros','servicios','contacto','reserva','admin']:
  driver.get(f'http://127.0.0.1:8765/{page}.html')
  wait.until(lambda d:d.find_element(By.CSS_SELECTOR,'nav a[href="admin.html"]').is_displayed())
  for width in [375,768,1440]:
   driver.set_window_size(width,1000)
   assert driver.execute_script('return document.documentElement.scrollWidth <= innerWidth'),(page,width)
 driver.get('http://127.0.0.1:8765/login.html');ready('admin.html')
 wait.until(lambda d:el('admin-dashboard').is_displayed())
 el('admin-logout').click()
 wait.until(lambda d:not el('admin-dashboard').is_displayed())
 wait.until(lambda d:not d.find_element(By.CSS_SELECTOR,'nav a[href="admin.html"]').is_displayed())
 print('PASS admin login, existing session, navigation, responsive widths and logout')
 for user in [{'uid':'client'},{'uid':'string','admin':'true'},{'uid':'failed','fail':True}]:
  driver.execute_script("sessionStorage.setItem('user',JSON.stringify(arguments[0]))",user)
  driver.get('http://127.0.0.1:8765/login.html')
  if user.get('fail'):
   wait.until(lambda d:'No se pudo verificar' in el('auth-message').text)
  else:ready('reserva.html')
  assert not driver.find_element(By.CSS_SELECTOR,'nav a[href="admin.html"]').is_displayed()
 print('PASS client routing, strict claim and verification failure')

finally:driver.quit();server.shutdown()
