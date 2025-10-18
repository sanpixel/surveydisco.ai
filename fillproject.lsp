(defun c:FILLPROJ (/ job-num url temp-file cmd response-text project-data ss ent blk-name att-list att-ent att-tag i tick-start)
  
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
      (command "shell" cmd)
      
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
          ;; Parse pipe-delimited data: jobNumber|geoAddress|preparedFor|serviceType
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
                          )
                        )
                        (princ (strcat "\nUpdated block instance " (rtos (+ i 1) 2 0)))
                      )
                    )
                    (setq i (+ i 1))
                  )
                  (princ "\nProject data filled successfully!")
                  (command "REGEN")
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

;; Helper function to parse pipe-delimited response
(defun parse-pipe-data (response-text / parts job-num address prep-for service-type)
  
  ;; Split by pipe character: jobNumber|geoAddress|preparedFor|serviceType
  (setq parts (split-string response-text "|"))
  
  (if (>= (length parts) 4)
    (progn
      (setq job-num (nth 0 parts))
      (setq address (nth 1 parts))
      (setq prep-for (nth 2 parts))
      (setq service-type (nth 3 parts))
      
      ;; Return association list
      (list
        (cons "jobNumber" job-num)
        (cons "address" address)
        (cons "preparedFor" prep-for)
        (cons "serviceType" service-type)
      )
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
;; H
elper function to read file contents
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