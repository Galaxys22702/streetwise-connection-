import tempfile
import unittest
from pathlib import Path
import worker

class QueueTests(unittest.TestCase):
    def test_persistence_deduplication_and_retry(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/"state.db"
            db=worker.connect(path)
            worker.seed(db,3600)
            worker.seed(db,3600)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM jobs").fetchone()[0],3)
            row=worker.claim(db,3600)
            worker.finish(db,row,("UNVERIFIED",None,"mock"),3600)
            db.close()
            db=worker.connect(path)
            self.assertEqual(worker.report(db)["checks"][0]["status"],"UNVERIFIED")
            self.assertEqual(db.execute("SELECT attempts FROM jobs WHERE id=?",(row["id"],)).fetchone()[0],1)
            db.close()

    def test_lease_and_stale_completion(self):
        with tempfile.TemporaryDirectory() as temp:
            db=worker.connect(Path(temp)/"state.db")
            worker.seed(db,3600)
            first=worker.claim(db,3600)
            second=worker.claim(db,3721)
            self.assertEqual(first["id"],second["id"])
            worker.finish(db,first,("VERIFIED",200,"mock"),3722)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM evidence").fetchone()[0],0)
            worker.finish(db,second,("VERIFIED",200,"mock"),3723)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM evidence").fetchone()[0],1)
            db.close()

    def test_unknown_target(self):
        self.assertEqual(worker.probe("arbitrary-url")[0],"FAILED")

if __name__=="__main__":
    unittest.main()
