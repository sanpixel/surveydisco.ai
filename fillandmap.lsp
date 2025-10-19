;;; === FILLANDMAP.lsp ===
;;; Combined FILLPROJ and MAPMAP functionality
;;; Fills block attributes then automatically inserts vicinity map

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

(defun _insert-map (addr / zoom pxw pxh scale url img p sc log)
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
          (prompt "\nPick insert point for map:")
          (setq p (getpoint))
          (setq sc 3.0)  ; Default scale factor
          (command "_.IMAGEATTACH" img p sc "")
          (princ (strcat "\nInserted map for: " addr))
        )
      )
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

;; Helper function to parse pipe-delimited response
(defun parse-pipe-data (response-text / parts job-num address prep-for service-type)
  
  ;; Split by pipe character: jobNumber|geoAddress|preparedFor|serviceType|landLot|district|county|deedBook|deedPage
  (setq parts (split-string response-text "|"))
  
  (if (>= (length parts) 9)
    (progn
      (setq job-num (nth 0 parts))
      (setq address (nth 1 parts))
      (setq prep-for (nth 2 parts))
      (setq service-type (nth 3 parts))
      (setq land-lot (nth 4 parts))
      (setq district (nth 5 parts))
      (setq county (nth 6 parts))
      (setq deed-book (nth 7 parts))
      (setq deed-page (nth 8 parts))
      
      ;; Return association list
      (list
        (cons "jobNumber" job-num)
        (cons "address" address)
        (cons "preparedFor" prep-for)
        (cons "serviceType" service-type)
        (cons "landLot" land-lot)
        (cons "district" district)
        (cons "county" county)
        (cons "deedBook" deed-book)
        (cons "deedPage" deed-page)
      )
    )
    nil
  )
)

(defun c:FILLANDMAP (/ job-num url temp-file cmd response-text project-data ss ent blk-name att-list att-ent att-tag i tick-start addr)
  
  ;; Get job number from user
  (setq job-num (getstring "\nEnter Job Number: "))
  
  (if job-num
    (progn
      (princ "\nFetching project data...")
      
      ;; Use curl for reliable HTTP requests - simple endpoint
      (setq url (strcat "https://surveydisco-ai-222526998280.us-central1.run.app/api/projects/autocad/" job-num))
      (setq temp-file (strcat (getenv "TEMP") "\\surveydisco_response.txt"))
      
      ;; Build curl command with proper error handling
      (setq cmd (strcat "curl -s -k --connect-timeout 30 --max-time 60 \"" url "\" -o \"" temp-file "\""))
      
      ;; Execute curl command synchronously
      (_run-sync cmd)
      
      ;; Wait for file to be created with CPU-safe tick loop
      (setq tick-start (getvar "MILLISECS"))
      (while (and (not (findfile temp-file)) 
                  (< (- (getvar "MILLISECS") tick-start) 30000)) ; 30 second timeout
        (command "delay" 100) ; 100ms delay
      )
      
      ;; Read response from file
      (if (findfile temp-file)
        (progn
          (setq response-text (read-file-contents temp-file))
          ;; Clean up temp file
          (vl-file-delete temp-file)
        )
        (progn
          (princ "\nError: Failed to fetch data from SurveyDisco API")
          (setq response-text nil)
        )
      )
      
      ;; Parse simple pipe-delimited response
      (setq project-data nil)
      
      ;; Check if we got valid data (not error message)
      (if (and response-text (not (vl-string-search "ERROR" response-text)) (not (vl-string-search "JOB_NOT_FOUND" response-text)))
        (progn
          ;; Parse pipe-delimited data
          (setq project-data (parse-pipe-data response-text))
          
          (if project-data
            (progn
              (princ "\nProject found! Updating blocks...")
              
              ;; Find all blocks in the drawing
              (setq ss (ssget "X" '((0 . "INSERT"))))
              
              (if ss
                (progn
                  (setq i 0)
                  (repeat (sslength ss)
                    (setq ent (ssname ss i))
                    (setq blk-name (cdr (assoc 2 (entget ent))))
                    
                    ;; Check if this is our target block
                    (if (= blk-name "SS_BLOCK_11X17")
                      (progn
                        ;; Get all attributes for this block
                        (setq att-list (vlax-invoke (vlax-ename->vla-object ent) 'GetAttributes))
                        
                        ;; Update each attribute
                        (foreach att att-list
                          (setq att-tag (vlax-get att 'TagString))
                          
                          (cond
                            ((= att-tag "JOB_NO")
                             (vlax-put att 'TextString (strcat "JOB NO.: " (cdr (assoc "jobNumber" project-data)))))
                            
                            ((= att-tag "SITE_ADDRESS")
                             (vlax-put att 'TextString (cdr (assoc "address" project-data))))
                            
                            ((= att-tag "PREP_FOR")
                             (vlax-put att 'TextString (cdr (assoc "preparedFor" project-data))))
                            
                            ((= att-tag "SURVEY_TYPE")
                             (vlax-put att 'TextString (cdr (assoc "serviceType" project-data))))
                            
                            ((= att-tag "LAND_LOT")
                             (vlax-put att 'TextString (strcat "LAND LOT: " (cdr (assoc "landLot" project-data)))))
                            
                            ((= att-tag "DISTRICT")
                             (vlax-put att 'TextString (strcat "DISTRICT: " (cdr (assoc "district" project-data)))))
                            
                            ((= att-tag "COUNTY")
                             (vlax-put att 'TextString (strcat "COUNTY: " (cdr (assoc "county" project-data)))))
                            
                            ((= att-tag "REF_DB_PG")
                             (vlax-put att 'TextString (strcat "REF DB " (cdr (assoc "deedBook" project-data)) " Page " (cdr (assoc "deedPage" project-data)))))
                          )
                        )
                        (princ (strcat "\nUpdated block instance " (rtos (+ i 1) 2 0)))
                      )
                    )
                    (setq i (+ i 1))
                  )
                  (princ "\nProject data filled successfully!")
                  (command "REGEN")
                  
                  ;; Now automatically insert the vicinity map
                  (setq addr (cdr (assoc "address" project-data)))
                  (if addr
                    (progn
                      (princ "\nInserting vicinity map...")
                      (_insert-map addr)
                    )
                    (princ "\nNo address found for map insertion.")
                  )
                )
                (princ "\nNo blocks found in drawing.")
              )
            )
            (princ "\nError parsing project data.")
          )
        )
        (princ (strcat "\nJob number " job-num " not found in SurveyDisco."))
      )

    )
    (princ "\nNo job number entered.")
  )
  (princ)
)