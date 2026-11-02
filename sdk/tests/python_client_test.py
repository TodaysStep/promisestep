"""Reference-client transport tests, using synthetic local responses only."""
import sys,unittest,json,threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'python'))
from promisestep import PublicAPIClient,PromiseStepError
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args): pass
 def do_GET(self):
  mode=self.path.split('/')[1];content=b'{"ready":true}';mime='application/json';code=200
  if mode=='redirect':self.send_response(302);self.send_header('Location','/normal/health');self.end_headers();return
  if mode=='html':mime='text/html';content=b'<html>not a service</html>'
  if mode=='bad':content=b'{broken'
  if mode=='nan':content=b'{"value":NaN}'
  if mode=='big':content=b' '*2000001
  if mode=='error':code=403
  self.send_response(code);self.send_header('Content-Type',mime);self.end_headers();self.wfile.write(content)
class ClientTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),Handler);cls.t=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.t.start();cls.base=f'http://127.0.0.1:{cls.server.server_port}/'
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close()
 def test_success(self):self.assertEqual(PublicAPIClient(self.base+'normal/').get('health'),{'ready':True})
 def test_no_query_credentials_fragment_in_base(self):
  for base in ['http://untrusted.test/api/','https://person:password@example.test/','https://example.test/?key=secret','https://example.test/#fragment','https://example.test/api']:
   with self.subTest(base=base),self.assertRaises(PromiseStepError):PublicAPIClient(base)
 def test_timeout_constraints(self):
  for timeout in [True,0,-1,61,float('nan'),float('inf'),'10']:
   with self.subTest(timeout=timeout),self.assertRaises(PromiseStepError):PublicAPIClient(timeout=timeout)
 def test_no_arbitrary_resource(self):
  for resource in ['../private','records','https://other.test','guidelines?data=private',1]:
   with self.subTest(resource=resource),self.assertRaises(PromiseStepError):PublicAPIClient(self.base+'normal/').get(resource)
 def test_redirect_refused(self):self.expect_error('redirect','UNEXPECTED_REDIRECT')
 def test_http_error(self):self.expect_error('error','HTTP_ERROR')
 def test_html_not_json(self):self.expect_error('html','INVALID_RESPONSE')
 def test_broken_json(self):self.expect_error('bad','INVALID_RESPONSE')
 def test_nonfinite_json(self):self.expect_error('nan','INVALID_RESPONSE')
 def test_size_limit(self):self.expect_error('big','LIMIT_EXCEEDED')
 def expect_error(self,mode,code):
  with self.assertRaises(PromiseStepError) as c:PublicAPIClient(self.base+mode+'/').get('health')
  self.assertEqual(c.exception.code,code)
if __name__=='__main__':unittest.main(verbosity=2)
