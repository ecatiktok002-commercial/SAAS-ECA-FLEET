#!/bin/bash
# Insert state for the modal
sed -i '/const queryClient = useQueryClient();/a \
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);\
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);\
  const [isDocsLoading, setIsDocsLoading] = useState(false);\
  const [currentDocIndex, setCurrentDocIndex] = useState(0);\
\
  const handleViewDocs = async (customerId: string) => {\
    setIsDocsLoading(true);\
    setIsDocsModalOpen(true);\
    setCurrentDocIndex(0);\
    try {\
      const docs = await apiService.getCustomerDocuments(customerId);\
      setSelectedDocs(docs);\
    } catch (err) {\
      console.error(err);\
      toast.error('"'"'Failed to load documents'"'"');\
      setSelectedDocs([]);\
    } finally {\
      setIsDocsLoading(false);\
    }\
  };' pages/CustomersPage.tsx

# Modify the Name td to be clickable
sed -i 's/<div className="font-bold text-slate-900">{customer.full_name || '"'"'-'"'"'}<\/div>/<button onClick={() => handleViewDocs(customer.id)} className="font-bold text-slate-900 hover:text-emerald-600 hover:underline text-left">{customer.full_name || '"'"'-'"'"'}<\/button>/g' pages/CustomersPage.tsx
