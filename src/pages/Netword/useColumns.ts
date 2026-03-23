const useColumns = () => {
  return [
    {
      title: "名称",
      dataIndex: "url",
      key: "url",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 100,
    },
    {
      title: "大小",
      dataIndex: "responseSize",
      key: "size",
      width: 100,
    },
    {
      title: "时间",
      dataIndex: "duration",
      key: "time",
      width: 120,
    },
  ].map((item) => ({ ...item, ellipsis: { showTitle: true } }));
};

export default useColumns;
