;;; === MAPMAP_wsrun_v1.lsp ===
;;; Synchronous downloader via WScript.Shell (no sleeps, no COM HTTP).
;;; Logs the exact URL next to the PNG for quick browser test.
;;; Commands: MAPMAP, MAPMAPBLOCK

(vl-load-com)

;; ====== SET YOUR KEY HERE ======
(setq *gmap-key* "AIzaSyCWor_ekjAcQN7MlArPm8uGm8IZB6t1rvU")
;; ================================

(defun _hex2 (n / digits r d)
  (setq digits "0123456789ABCDEF" r "")
  (repeat 2 (setq d (rem n 16) r (strcat (substr digits (1+ d) 1) r) n (fix (/ n 16.0))))
  r)

(defun _url-encode (s / r c)
  (setq r "")
  (foreach c (vl-string->list s)
    (setq r (strcat r (if (or (and (>= c 48) (<= c 57)) (and (>= c 65) (<= c 90)) (and (>= c 97) (<= c 122)) (member c '(45 95 46 126)))
                         (chr c) (strcat "%" (_hex2 c))))))
  r)

(defun _mk-url (addr zoom w h scale)
  (strcat
    "https://maps.googleapis.com/maps/api/staticmap?"
    "center=" (_url-encode addr)
    "&zoom=" (itoa zoom)
    "&size=" (itoa w) "x" (itoa h)
    "&scale=" (itoa scale)
    "&maptype=roadmap&format=png&style=saturation:-100"
    "&markers=color:black%7Csize:large%7Clabel:S%7C" (_url-encode addr)
    "&key=" *gmap-key*))

(defun _temp-png (addr)
  (vl-filename-mktemp (strcat (vl-string-translate " /\\:;,*?\"<>|" "___________" addr) "_") nil ".png"))

(defun _write-text (path text / f)
  (if (setq f (open path "w"))
    (progn (write-line text f) (close f) T)
    nil))

(defun _run-sync (cmd / sh rc)
  (setq sh (vlax-create-object "WScript.Shell"))
  (setq rc (vlax-invoke sh 'Run (strcat "cmd.exe /c " cmd) 0 :vlax-true))
  (vlax-release-object sh)
  rc)

(defun _dl-curl (url out)
  (_run-sync (strcat "curl -f -L -s -S -o \"" out "\" \"" url "\""))
  (findfile out))

(defun _dl-certutil (url out)
  (_run-sync (strcat "certutil -urlcache -split -f \"" url "\" \"" out "\""))
  (findfile out))

(defun _download-png (url out)
  (or (_dl-curl url out) (_dl-certutil url out)))

(defun _erase-old-images-in-ref (/ s)
  (if (not (eq (getvar 'refeditname) ""))
    (vl-catch-all-apply
      '(lambda ()
         (command "_.QSELECT" "_Object" "_Image" "_Entire" "" "_Properties" "_All" "_=*" "" )
         (if (setq s (ssget "_P")) (command "_.ERASE" s ""))
       ))))

(defun _insert-map-common (addr / zoom pxw pxh scale url img p sc log)
  (if (or (not addr) (= addr "")) (progn (prompt "\nNo address.") (princ))
    (progn
      ;; Use sensible defaults - no prompts
      (setq zoom 16)    ; Good detail level for surveying
      (setq pxw 640)    ; Standard width
      (setq pxh 480)    ; Standard height (4:3 ratio)
      (setq scale 2)    ; High resolution
      (setq url (_mk-url addr zoom pxw pxh scale))
      (setq img (_temp-png addr))
      (setq log (strcat img ".url.txt"))
      (_write-text log url)
      (prompt (strcat "\nDownloading map... (URL saved: " log ")"))
      (if (not (_download-png url img))
        (progn (prompt "\nDownload failed.") (princ))
        (progn
          (prompt "\nPick insert point:")
          (setq p (getpoint))
          (setq sc 3.0)  ; Default scale factor
          (command "_.IMAGEATTACH" img p sc "")
          (princ (strcat "\nInserted map for: " addr))
        )
      )
    )
  )
)

(defun c:MAPMAP (/ job-num url temp-file cmd response-text addr)
  ;; Get job number from user
  (setq job-num (getstring "\nEnter Job Number: "))
  
  (if job-num
    (progn
      (princ "\nFetching address from SurveyDisco...")
      
      ;; Use curl to get project data from SurveyDisco API
      (setq url (strcat "https://surveydisco-ai-222526998280.us-central1.run.app/api/projects/autocad/" job-num))
      (setq temp-file (strcat (getenv "TEMP") "\\surveydisco_addr.txt"))
      
      ;; Build curl command
      (setq cmd (strcat "curl -s -k --connect-timeout 30 --max-time 60 \"" url "\" -o \"" temp-file "\""))
      
      ;; Execute curl command synchronously
      (_run-sync cmd)
      
      ;; Read response from file
      (if (findfile temp-file)
        (progn
          (setq response-text (read-file-contents temp-file))
          ;; Clean up temp file
          (vl-file-delete temp-file)
          
          (if (and response-text (not (vl-string-search "ERROR" response-text)) (not (vl-string-search "JOB_NOT_FOUND" response-text)))
            (progn
              ;; Parse pipe-delimited data: jobNumber|geoAddress|preparedFor|serviceType|...
              (setq parts (split-string response-text "|"))
              (if (>= (length parts) 2)
                (progn
                  (setq addr (nth 1 parts)) ; geoAddress is second field
                  (princ (strcat "\nFound address: " addr))
                  (_insert-map-common addr)
                )
                (progn
                  (princ "\nError: Invalid response format")
                  (princ)
                )
              )
            )
            (progn
              (princ (strcat "\nJob number " job-num " not found in SurveyDisco"))
              (princ)
            )
          )
        )
        (progn
          (princ "\nError: Failed to fetch data from SurveyDisco API")
          (princ)
        )
      )
    )
    (progn
      (princ "\nNo job number entered.")
      (princ)
    )
  )
)

;; Helper function to read file contents
(defun read-file-contents (filename / file-handle content line)
  (setq content "")
  (if (setq file-handle (open filename "r"))
    (progn
      (while (setq line (read-line file-handle))
        (setq content (strcat content line))
      )
      (close file-handle)
      content
    )
    nil
  )
)

;; Helper function to split string by delimiter
(defun split-string (str delimiter / result pos start)
  (setq result '())
  (setq start 1)
  
  (while (setq pos (vl-string-search delimiter str (- start 1)))
    (setq result (append result (list (substr str start (- pos start -1)))))
    (setq start (+ pos 2))
  )
  
  ;; Add the last part
  (setq result (append result (list (substr str start))))
  result
)

(defun c:MAPMAPBLOCK (/ pick ed dxf0 bref job-num url temp-file cmd response-text addr parts)
  (prompt "\nSelect block to insert map into:")
  (setq pick (car (entsel)))
  (if (not pick) (progn (prompt "\nNothing selected.") (princ))
    (progn
      (setq ed (entget pick) dxf0 (cdr (assoc 0 ed)))
      (if (= dxf0 "ATTRIB") (setq bref (cdr (assoc 330 ed))) (setq bref pick))
      
      ;; Get job number from user
      (setq job-num (getstring "\nEnter Job Number: "))
      
      (if job-num
        (progn
          (princ "\nFetching address from SurveyDisco...")
          
          ;; Use curl to get project data from SurveyDisco API
          (setq url (strcat "https://surveydisco-ai-222526998280.us-central1.run.app/api/projects/autocad/" job-num))
          (setq temp-file (strcat (getenv "TEMP") "\\surveydisco_addr.txt"))
          
          ;; Build curl command
          (setq cmd (strcat "curl -s -k --connect-timeout 30 --max-time 60 \"" url "\" -o \"" temp-file "\""))
          
          ;; Execute curl command synchronously
          (_run-sync cmd)
          
          ;; Read response from file
          (if (findfile temp-file)
            (progn
              (setq response-text (read-file-contents temp-file))
              ;; Clean up temp file
              (vl-file-delete temp-file)
              
              (if (and response-text (not (vl-string-search "ERROR" response-text)) (not (vl-string-search "JOB_NOT_FOUND" response-text)))
                (progn
                  ;; Parse pipe-delimited data: jobNumber|geoAddress|preparedFor|serviceType|...
                  (setq parts (split-string response-text "|"))
                  (if (>= (length parts) 2)
                    (progn
                      (setq addr (nth 1 parts)) ; geoAddress is second field
                      (princ (strcat "\nFound address: " addr))
                      
                      (if (or (not addr) (= addr "")) (progn (prompt "\nNo address found.") (princ))
                        (progn
                          (command "_.REFEDIT" bref "")
                          (_erase-old-images-in-ref)
                          (_insert-map-common addr)
                          (command "_.REFCLOSE" "_S")
                        ))
                    )
                    (progn
                      (princ "\nError: Invalid response format")
                      (princ)
                    )
                  )
                )
                (progn
                  (princ (strcat "\nJob number " job-num " not found in SurveyDisco"))
                  (princ)
                )
              )
            )
            (progn
              (princ "\nError: Failed to fetch data from SurveyDisco API")
              (princ)
            )
          )
        )
        (progn
          (princ "\nNo job number entered.")
          (princ)
        )
      )
    ))
  (princ)
)
